/*
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20NoLockUpStakingPool is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    uint256 public constant PRECISION_FACTOR = 10e18;

    error InvalidStakingPeriod();
    error InvalidStartTime();
    error InvalidLockupTime();
    error InvalidAmount();
    error NothingToClaim();
    error InsufficientAmount(uint256 amount);
    error PoolNotStarted();
    error PoolHasEnded();
    error PoolNotActive();
    error PoolIsActive();
    error NotAdmin();

    modifier onlyAdmin() {
        if (msg.sender != pool.adminWallet) revert NotAdmin();
        _;
    }
    modifier validPool() {
        if (block.timestamp < pool.startTime) revert PoolNotStarted();
        if (!pool.isActive) revert PoolNotActive();
        _;
    }

    struct User {
        uint256 amount;
        uint256 claimed;
        uint256 rewardDebt;
        uint256 pending;
    }

    struct Pool {
        IERC20 stakeToken;
        IERC20 rewardToken;
        uint256 startTime;
        uint256 endTime;
        uint256 rewardTokenPerSecond;
        uint256 totalStaked;
        uint256 totalClaimed;
        uint256 lastRewardTimestamp;
        uint256 accRewardPerShare;
        bool isActive;
        address adminWallet;
        mapping(address => User) userInfo;
    }
    Pool public pool;

    //Events
    event Stake(address user, uint256 amount);
    event Unstake(address user, uint256 amount);
    event Claim(address user, uint256 amount);
    event ActivatePool(uint256 rewardAmount);
    event UpdatePool(
        uint256 totalStaked,
        uint256 accumulatedRewardTokenPerShare,
        uint256 lastBlockNumber
    );

    constructor(
        address stakeToken,
        address rewardToken,
        uint256 rewardTokenPerSecond,
        uint256 poolStartTime,
        uint256 poolEndTime,
        address adminAddress
    ) Ownable(msg.sender) {
        if (poolStartTime > poolEndTime) revert InvalidStakingPeriod();
        if (poolStartTime < block.timestamp) revert InvalidStartTime();
        pool.stakeToken = IERC20(stakeToken);
        pool.rewardToken = IERC20(rewardToken);
        pool.rewardTokenPerSecond = rewardTokenPerSecond;
        pool.lastRewardTimestamp = poolStartTime;
        pool.startTime = poolStartTime;
        pool.endTime = poolEndTime;
        pool.adminWallet = adminAddress;
    }

    function stake(uint256 _amount) external validPool {
        if (_amount == 0) revert InvalidAmount();
        _updatePool();
        User storage user = pool.userInfo[msg.sender];
        uint256 share = pool.accRewardPerShare;
        uint256 amount = user.amount;
        if (amount > 0) {
            user.pending +=
                (amount * share) /
                PRECISION_FACTOR -
                user.rewardDebt;
        }
        unchecked {
            user.amount = amount + _amount;
        }
        user.rewardDebt = (user.amount * share) / PRECISION_FACTOR;
        pool.totalStaked += _amount;
        pool.stakeToken.safeTransferFrom(msg.sender, address(this), _amount);
        emit Stake(msg.sender, _amount);
    }

    function unstake(uint256 _amount) external nonReentrant {
        if (_amount == 0) revert InvalidAmount();
        User storage user = pool.userInfo[msg.sender];
        uint256 amount = user.amount;
        if (amount < _amount) revert InsufficientAmount(amount);
        _updatePool();
        uint256 share = pool.accRewardPerShare;
        user.pending += ((amount * share) / PRECISION_FACTOR) - user.rewardDebt;
        unchecked {
            user.amount -= _amount;
        }
        user.rewardDebt = (user.amount * share) / PRECISION_FACTOR;
        pool.totalStaked -= _amount;
        pool.stakeToken.safeTransfer(msg.sender, _amount);
        emit Unstake(msg.sender, _amount);
    }

    function claim() external nonReentrant {
        _updatePool();
        User storage user = pool.userInfo[msg.sender];
        uint256 amount = user.amount;
        uint256 pending = user.pending;
        if (amount > 0) {
            pending +=
                (amount * pool.accRewardPerShare) /
                PRECISION_FACTOR -
                user.rewardDebt;
            user.rewardDebt =
                (amount * pool.accRewardPerShare) /
                PRECISION_FACTOR;
        }
        if (pending == 0) revert NothingToClaim();
        // Transfer pending rewards to the user
        user.pending = 0;
        unchecked {
            user.claimed += pending;
        }
        pool.totalClaimed += pending;
        pool.rewardToken.safeTransfer(msg.sender, pending);
        emit Claim(msg.sender, pending);
    }

    /// @notice Function to activate the staking pool
    /// @dev Protected by onlyAdmin modifier. Only platform admin can activate pools
    function activate() external onlyAdmin {
        // Check if the pool is already active
        if (pool.isActive) revert PoolIsActive();

        // Check if the current timestamp is after the end time of the pool
        if (block.timestamp >= pool.endTime) revert PoolHasEnded();

        // Activate the pool
        pool.isActive = true;

        // Calculate the reward amount to fund the pool
        uint256 timestampToFund = block.timestamp > pool.startTime
            ? block.timestamp
            : pool.startTime;
        uint256 rewardAmount = (pool.endTime - timestampToFund) *
            pool.rewardTokenPerSecond;

        // Transfer reward tokens from the owner to the contract
        // slither-disable-next-line arbitrary-send-erc20
        pool.rewardToken.safeTransferFrom(owner(), address(this), rewardAmount);

        // Emit activation event
        emit ActivatePool(rewardAmount);
    }

    function pendingRewards(
        address userAddress
    ) external view returns (uint256) {
        User storage user = pool.userInfo[userAddress];
        uint256 share = pool.accRewardPerShare;
        if (
            block.timestamp > pool.lastRewardTimestamp && pool.totalStaked != 0
        ) {
            uint256 elapsedPeriod = _getMultiplier(
                pool.lastRewardTimestamp,
                block.timestamp
            );
            uint256 totalNewReward = pool.rewardTokenPerSecond * elapsedPeriod;
            share =
                share +
                ((totalNewReward * PRECISION_FACTOR) / pool.totalStaked);
        }
        return
            user.pending +
            ((user.amount * share) / PRECISION_FACTOR) -
            user.rewardDebt;
    }

    function getUserInfo(
        address user
    ) external view returns (User memory userInfo) {
        userInfo = pool.userInfo[user];
    }

    function _updatePool() internal {
        if (block.timestamp > pool.lastRewardTimestamp) {
            if (pool.totalStaked != 0) {
                uint256 elapsedPeriod = _getMultiplier(
                    pool.lastRewardTimestamp,
                    block.timestamp
                );
                pool.accRewardPerShare +=
                    (pool.rewardTokenPerSecond *
                        PRECISION_FACTOR *
                        elapsedPeriod) /
                    pool.totalStaked;
            }
            pool.lastRewardTimestamp = block.timestamp;
            emit UpdatePool(
                pool.totalStaked,
                pool.accRewardPerShare,
                block.timestamp
            );
        }
    }

    /**
     * @notice Return reward multiplier over the given `_from` to `_to` block.
     * If the `from` block is higher than the pool's reward-end block,
     * the function returns 0 and therefore rewards are no longer updated.
     * @param _from timestamp to start
     * @param _to timestamp to finish
     */
    function _getMultiplier(
        uint256 _from,
        uint256 _to
    ) internal view returns (uint256) {
        if (_to <= pool.endTime) {
            return _to - _from;
        } else if (_from >= pool.endTime) {
            return 0;
        } else {
            return pool.endTime - _from;
        }
    }
}
