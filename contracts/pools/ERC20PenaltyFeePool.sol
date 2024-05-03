/*
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20BasePool} from "../interfaces/IERC20BasePool.sol";
import {IErrors} from "../interfaces/IErrors.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20PenaltyFeePool is
    ReentrancyGuard,
    Ownable,
    IERC20BasePool,
    IErrors
{
    using SafeERC20 for IERC20;
    uint256 public constant PRECISION_FACTOR = 10e18;
    uint256 public constant PENALTY_FEE = 2500;
    uint256 public constant COLLECTABLE_FEE = 100;

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
        uint256 penaltyEndTime;
        bool penalized;
    }

    struct Pool {
        IERC20 stakeToken;
        IERC20 rewardToken;
        uint256 startTime;
        uint256 endTime;
        uint256 penaltyPeriod;
        uint256 rewardTokenPerSecond;
        uint256 totalStaked;
        uint256 totalClaimed;
        uint256 totalPenalties;
        uint256 lastRewardTimestamp;
        uint256 accRewardPerShare;
        bool isActive;
        address adminWallet;
    }
    ///@dev Public pool variable to access pool data
    Pool public pool;
    ///@dev Mapping to store user-specific staking information
    mapping(address => User) public userInfo;

    constructor(
        address stakeToken,
        address rewardToken,
        uint256 rewardTokenPerSecond,
        uint256 poolStartTime,
        uint256 poolEndTime,
        uint256 penaltyPeriod,
        address adminAddress
    ) Ownable(msg.sender) {
        if (poolStartTime > poolEndTime) revert InvalidStakingPeriod();
        if (poolStartTime < block.timestamp) revert InvalidStartTime();
        if (poolEndTime - poolStartTime > penaltyPeriod)
            revert InvalidPenaltyPeriod();
        pool.stakeToken = IERC20(stakeToken);
        pool.rewardToken = IERC20(rewardToken);
        pool.rewardTokenPerSecond = rewardTokenPerSecond;
        pool.lastRewardTimestamp = poolStartTime;
        pool.startTime = poolStartTime;
        pool.endTime = poolEndTime;
        pool.penaltyPeriod = penaltyPeriod;
        pool.adminWallet = adminAddress;
    }

    /**
     * @dev See {IERC20BasePool-stake}.
     */
    function stake(uint256 amount) external validPool {
        if (amount == 0) revert InvalidAmount();
        _updatePool();
        User storage user = userInfo[msg.sender];
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
        user.penaltyEndTime = block.timestamp + pool.penaltyPeriod >
            pool.endTime
            ? pool.endTime
            : block.timestamp + pool.penaltyPeriod;
        user.rewardDebt = (user.amount * share) / PRECISION_FACTOR;
        pool.totalStaked += amount;
        pool.stakeToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Stake(msg.sender, amount);
    }

    /**
     * @dev See {IERC20BasePool-unstake}.
     */
    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        User storage user = userInfo[msg.sender];
        uint256 currentAmount = user.amount;
        if (currentAmount < amount) revert InsufficientAmount(currentAmount, amount);
        _updatePool();
        uint256 share = pool.accRewardPerShare;
        if (block.timestamp <= user.penaltyEndTime) user.penalized = true;
        user.pending += ((currentAmount * share) / PRECISION_FACTOR) - user.rewardDebt;
        unchecked {
            user.amount -= amount;
        }
        user.rewardDebt = (user.amount * share) / PRECISION_FACTOR;
        pool.totalStaked -= amount;
        pool.stakeToken.safeTransfer(msg.sender, amount);
        emit Unstake(msg.sender, amount);
    }

    /**
     * @dev See {IERC20BasePool-claim}.
     */
    function claim() external nonReentrant {
        User storage user = userInfo[msg.sender];
        if (block.timestamp < user.penaltyEndTime)
            revert TokensInLockup(block.timestamp, user.penaltyEndTime);
        _updatePool();
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
        user.pending = 0;
        uint256 penalityAmount = _calculatePenalizedAmount(
            user.penalized,
            pending
        );
        pending -= penalityAmount;
        if (user.penalized) user.penalized = false;
        unchecked {
            user.claimed += pending;
        }
        pool.totalClaimed += pending;
        pool.totalPenalties += penalityAmount;
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

    /**
     * @dev See {IERC20BasePool-pendingRewards}.
     */
    function pendingRewards(address userAddress) public view returns (uint256) {
        User storage user = userInfo[userAddress];
        uint256 share = pool.accRewardPerShare;
        uint256 pending = user.pending;
        if (
            block.timestamp > pool.lastRewardTimestamp && pool.totalStaked > 0
        ) {
            uint256 elapsedPeriod = _getMultiplier(
                block.timestamp,
                pool.lastRewardTimestamp
            );
            uint256 totalNewReward = pool.rewardTokenPerSecond * elapsedPeriod;
            share =
                share +
                ((totalNewReward * PRECISION_FACTOR) / pool.totalStaked);
        }
        pending += ((user.amount * share) / PRECISION_FACTOR) - user.rewardDebt;
        return pending - _calculatePenalizedAmount(user.penalized, pending);
    }

    function _updatePool() internal {
        if (block.timestamp > pool.lastRewardTimestamp) {
            if (pool.totalStaked != 0) {
                uint256 elapsedPeriod = _getMultiplier(
                    block.timestamp,
                    pool.lastRewardTimestamp
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

    function _calculatePenalizedAmount(
        bool penalized,
        uint256 _amountToPenalize
    ) internal pure returns (uint256) {
        if (penalized) {
            return (_amountToPenalize * PENALTY_FEE) / 10000;
        }
        // Flat 1% penalty fee in basis points if the penalty period has already ended
        return (_amountToPenalize * COLLECTABLE_FEE) / 10000;
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
