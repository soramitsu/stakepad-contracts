/*
SPDX-License-Identifier: MIT
*/
pragma solidity 0.8.25;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {INoLockupPoolERC20} from "../interfaces/IERC20Pools/INoLockupPoolERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20NoLockUpStakingPool is ReentrancyGuard, Ownable, INoLockupPoolERC20 {
    using SafeERC20 for IERC20;
    uint256 public constant PRECISION_FACTOR = 10e18;

    modifier onlyAdmin() {
        if (msg.sender != pool.adminWallet) revert NotAdmin();
        _;
    }
    modifier validPool() {
        if (block.timestamp < pool.startTime) revert PoolNotStarted();
        _;
    }
    ///@dev Public pool variable to access pool data
    Pool public pool;
    ///@dev Mapping to store user-specific staking information
    mapping(address => UserInfo) public userInfo;

    /// @notice Constructor to initialize the staking pool with specified parameters
    /// @param stakeToken Address of the ERC20 token to be staked
    /// @param rewardToken Address of the ERC20 token used for rewards
    /// @param rewardTokenPerSecond Rate of rewards per second
    /// @param poolStartTime Start time of the staking pool
    /// @param poolEndTime End time of the staking pool
    /// @param adminAddress Address of the admin
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
        pool.stakeToken = stakeToken;
        pool.rewardToken = rewardToken;
        pool.rewardTokenPerSecond = rewardTokenPerSecond;
        pool.lastRewardTimestamp = poolStartTime;
        pool.startTime = poolStartTime;
        pool.endTime = poolEndTime;
        pool.adminWallet = adminAddress;
    }

    /**
     * @dev See {IBasePoolERC20-stake}.
     */
    function stake(uint256 amount) external validPool {
        if (amount == 0) revert InvalidAmount();
        _updatePool();
        UserInfo storage user = userInfo[msg.sender];
        uint256 share = pool.accRewardPerShare;
        uint256 currentAmount = user.amount;
        if (currentAmount > 0) {
            user.pending +=
                (currentAmount * share) /
                PRECISION_FACTOR -
                user.rewardDebt;
        }
        unchecked {
            user.amount = currentAmount + amount;
        }
        user.rewardDebt = (user.amount * share) / PRECISION_FACTOR;
        pool.totalStaked += amount;
        IERC20(pool.stakeToken).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );
        emit Stake(msg.sender, amount);
    }

    /**
     * @dev See {IBasePoolERC20-unstake}.
     */
    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        UserInfo storage user = userInfo[msg.sender];
        uint256 currentAmount = user.amount;
        if (currentAmount < amount)
            revert InsufficientAmount(currentAmount, amount);
        _updatePool();
        uint256 share = pool.accRewardPerShare;
        user.pending +=
            ((currentAmount * share) / PRECISION_FACTOR) -
            user.rewardDebt;
        unchecked {
            user.amount -= amount;
        }
        user.rewardDebt = (user.amount * share) / PRECISION_FACTOR;
        pool.totalStaked -= amount;
        IERC20(pool.stakeToken).safeTransfer(msg.sender, amount);
        emit Unstake(msg.sender, amount);
    }

    /**
     * @dev See {IBasePoolERC20-claim}.
     */
    function claim() external nonReentrant {
        _updatePool();
        UserInfo storage user = userInfo[msg.sender];
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
        IERC20(pool.rewardToken).safeTransfer(msg.sender, pending);
        emit Claim(msg.sender, pending);
    }

    /**
     * @dev See {IBasePoolERC20-pendingRewards}.
     */
    function pendingRewards(
        address userAddress
    ) external view returns (uint256) {
        UserInfo storage user = userInfo[userAddress];
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
