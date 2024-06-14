// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

// Import OpenZeppelin contracts for ERC20 token interaction, reentrancy protection, safe token transfers, and ownership management.
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPoolERC20} from "../interfaces/IERC20Pool.sol";
import {ILockUpPoolStorage} from "../interfaces/ILockUpPool.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC20LockUpPool
/// @notice A smart contract for staking ERC20 tokens and earning rewards over a specified period.
contract ERC20LockUpPool is ReentrancyGuard, Ownable, IPoolERC20, ILockUpPoolStorage {
    using SafeERC20 for IERC20;

    /// @dev Precision factor for calculations
    uint256 public constant PRECISION_FACTOR = 10e18;

    ///@dev Public pool variable to access pool data
    LockUpPool public pool;
    ///@dev Mapping to store user-specific staking information
    mapping(address => UserInfo) public userInfo;

    /// @dev Modifier to ensure that functions can only be executed when the pool is active and within the specified time range
    modifier validPool() {
        if (block.timestamp < pool.startTime) revert PoolNotStarted();
        if (block.timestamp > pool.endTime) revert PoolHasEnded();
        _;
    }

    /// @notice Constructor to initialize the staking pool with specified parameters
    /// @param stakeToken Address of the ERC20 token to be staked
    /// @param rewardToken Address of the ERC20 token used for rewards
    /// @param poolStartTime Start time of the staking pool
    /// @param poolEndTime End time of the staking pool
    /// @param unstakeLockUp LockUp period for unstaking
    /// @param claimLockUp LockUp period for claiming rewards
    /// @param rewardTokenPerSecond Rate of rewards per second
    constructor(
        address stakeToken,
        address rewardToken,
        uint256 poolStartTime,
        uint256 poolEndTime,
        uint256 unstakeLockUp,
        uint256 claimLockUp,
        uint256 rewardTokenPerSecond
    ) Ownable(msg.sender) {
        // Ensure the start time is in the future
        if (poolStartTime < block.timestamp) revert InvalidStartTime();
        // Ensure the staking period is valid
        if (poolStartTime > poolEndTime) revert InvalidStakingPeriod();
        // Ensure the LockUp periods are valid
        if (unstakeLockUp > poolEndTime || claimLockUp > poolEndTime)
            revert InvalidLockUpTime();

        // Initialize pool parameters
        pool.stakeToken = stakeToken;
        pool.rewardToken = rewardToken;
        pool.startTime = poolStartTime;
        pool.endTime = poolEndTime;
        pool.unstakeLockUpTime = unstakeLockUp;
        pool.claimLockUpTime = claimLockUp;
        pool.rewardTokenPerSecond = rewardTokenPerSecond;
        pool.lastUpdateTimestamp = poolStartTime;
    }

    /**
     * @dev See {IBasePoolERC20-stake}.
     */
    function stake(uint256 amount) external validPool {
        // Ensure the amount to stake is not zero
        if (amount == 0) revert InvalidAmount();
        // Update the pool
        _updatePool();
        // Get user information
        UserInfo storage user = userInfo[msg.sender];
        uint256 share = pool.accRewardPerShare;
        uint256 currentAmount = user.amount;
        // Calculate pending rewards
        if (currentAmount > 0) {
            user.pending +=
                (currentAmount * share) /
                PRECISION_FACTOR -
                user.rewardDebt;
        }
        // Update user data
        unchecked {
            user.amount = currentAmount + amount;
        }
        user.rewardDebt = (user.amount * share) / PRECISION_FACTOR;
        // Update total staked amount
        pool.totalStaked += amount;
        // Transfer tokens from user to contract
        IERC20(pool.stakeToken).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );
        // Emit stake event
        emit Stake(msg.sender, amount);
    }

    /**
     * @dev See {IBasePoolERC20-unstake}.
     */
    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        // Check if the current timestamp is before the unstake LockUp time
        if (block.timestamp < pool.unstakeLockUpTime)
            revert TokensInLockUp(block.timestamp, pool.unstakeLockUpTime);
        // Get user information
        UserInfo storage user = userInfo[msg.sender];
        uint256 currentAmount = user.amount;
        // Ensure the user has enough staked tokens
        if (currentAmount < amount)
            revert InsufficientAmount(amount, currentAmount);
        // Update the pool
        _updatePool();
        // Get accumulated rewards per share
        uint256 share = pool.accRewardPerShare;
        // Calculate pending rewards
        user.pending +=
            ((currentAmount * share) / PRECISION_FACTOR) -
            user.rewardDebt;
        // Update user data
        unchecked {
            user.amount -= amount;
        }
        user.rewardDebt = (user.amount * share) / PRECISION_FACTOR;
        // Update total staked amount
        pool.totalStaked -= amount;
        // Transfer tokens from contract to user
        IERC20(pool.stakeToken).safeTransfer(msg.sender, amount);
        // Emit unstake event
        emit Unstake(msg.sender, amount);
    }

    /**
     * @dev See {IBasePoolERC20-claim}.
     */
    function claim() external nonReentrant {
        // Check if the current timestamp is before the claim LockUp time
        if (block.timestamp < pool.claimLockUpTime)
            revert TokensInLockUp(block.timestamp, pool.claimLockUpTime);
        // Update the pool
        _updatePool();
        // Get user information
        UserInfo storage user = userInfo[msg.sender];
        uint256 amount = user.amount;
        uint256 pending = user.pending;
        // Calculate pending rewards
        if (amount > 0) {
            pending +=
                (amount * pool.accRewardPerShare) /
                PRECISION_FACTOR -
                user.rewardDebt;
            user.rewardDebt =
                (user.amount * pool.accRewardPerShare) /
                PRECISION_FACTOR;
        }
        if (pending > 0) {
            // Transfer pending rewards to the user
            user.pending = 0;
            unchecked {
                user.claimed += pending;
            }
            pool.totalClaimed += pending;
            IERC20(pool.rewardToken).safeTransfer(msg.sender, pending);
            emit Claim(msg.sender, pending, 0, 0);
        } else {
            revert NothingToClaim();
        }
    }

    /**
     * @dev See {IBasePoolERC20-pendingRewards}.
     */
    function pendingRewards(
        address userAddress
    ) external view returns (uint256) {
        // Get user information
        UserInfo storage user = userInfo[userAddress];
        uint256 share = pool.accRewardPerShare;
        // Update accumulated rewards per share if necessary
        if (
            block.timestamp > pool.lastUpdateTimestamp && pool.totalStaked != 0
        ) {
            uint256 elapsedPeriod = _getMultiplier(
                pool.lastUpdateTimestamp,
                block.timestamp
            );
            uint256 totalNewReward = pool.rewardTokenPerSecond * elapsedPeriod;
            share += (totalNewReward * PRECISION_FACTOR) / pool.totalStaked;
        }
        // Calculate pending rewards
        return
            user.pending +
            ((user.amount * share) / PRECISION_FACTOR) -
            user.rewardDebt;
    }

    /**
     * @notice Update reward variables of the given pool to be up-to-date.
     * @dev If the current block number is higher than the reward-end block,
     * the pool rewadrs are no longer updated (stopped).
     */
    function _updatePool() internal {
        uint256 lastTimestamp = pool.lastUpdateTimestamp;
        uint256 total = pool.totalStaked;
        // Update accumulated rewards per share if necessary
        if (block.timestamp > lastTimestamp) {
            if (total > 0) {
                uint256 elapsedPeriod = _getMultiplier(
                    lastTimestamp,
                    block.timestamp
                );
                pool.accRewardPerShare +=
                    (pool.rewardTokenPerSecond *
                        PRECISION_FACTOR *
                        elapsedPeriod) /
                    total;
            }
            pool.lastUpdateTimestamp = block.timestamp;
            emit UpdatePool(total, pool.accRewardPerShare, block.timestamp);
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
