// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

// Import OpenZeppelin contracts for ERC20 token interaction, reentrancy protection, safe token transfers, and ownership management.
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20BasePool} from "../interfaces/IERC20BasePool.sol";
import {IErrors} from "../interfaces/IErrors.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC20LockUpStakingPool
/// @notice A smart contract for staking ERC20 tokens and earning rewards over a specified period.
contract ERC20LockUpStakingPool is
    ReentrancyGuard,
    Ownable,
    IERC20BasePool,
    IErrors
{
    using SafeERC20 for IERC20;

    /// @dev Precision factor for calculations
    uint256 public constant PRECISION_FACTOR = 10e18;

    /// @dev Modifier to allow only the admin to execute certain functions
    modifier onlyAdmin() {
        if (msg.sender != pool.adminWallet) revert NotAdmin();
        _;
    }

    /// @dev Modifier to ensure that functions can only be executed when the pool is active and within the specified time range
    modifier validPool() {
        if (block.timestamp < pool.startTime) revert PoolNotStarted();
        if (!pool.isActive) revert PoolNotActive();
        _;
    }

    // Struct to hold user-specific staking information
    struct User {
        uint256 amount; // Amount of tokens staked
        uint256 claimed; // Amount of claimed rewards
        uint256 rewardDebt; // Reward debt
        uint256 pending; // Pending rewards
    }

    // Struct to hold pool-related data
    struct Pool {
        IERC20 stakeToken; // ERC20 token being staked
        IERC20 rewardToken; // ERC20 token used for rewards
        uint256 startTime; // Start time of the staking pool
        uint256 endTime; // End time of the staking pool
        uint256 unstakeLockupTime; // Lockup period for unstaking
        uint256 claimLockupTime; // Lockup period for claiming rewards
        uint256 rewardTokenPerSecond; // Rate of rewards per second
        uint256 totalStaked; // Total amount of tokens staked
        uint256 totalClaimed; // Total amount of claimed rewards
        uint256 lastRewardTimestamp; // Timestamp of the last reward update
        uint256 accRewardPerShare; // Accumulated rewards per share
        bool isActive; // Flag indicating if the pool is active
        address adminWallet; // Address of the admin
    }
    ///@dev Public pool variable to access pool data
    Pool public pool;
    ///@dev Mapping to store user-specific staking information
    mapping(address => User) public userInfo;

    /// @notice Constructor to initialize the staking pool with specified parameters
    /// @param stakeToken Address of the ERC20 token to be staked
    /// @param rewardToken Address of the ERC20 token used for rewards
    /// @param rewardTokenPerSecond Rate of rewards per second
    /// @param poolStartTime Start time of the staking pool
    /// @param poolEndTime End time of the staking pool
    /// @param unstakeLockup Lockup period for unstaking
    /// @param claimLockup Lockup period for claiming rewards
    /// @param adminAddress Address of the admin
    constructor(
        address stakeToken,
        address rewardToken,
        uint256 rewardTokenPerSecond,
        uint256 poolStartTime,
        uint256 poolEndTime,
        uint256 unstakeLockup,
        uint256 claimLockup,
        address adminAddress
    ) Ownable(msg.sender) {
        // Ensure the staking period is valid
        if (poolStartTime > poolEndTime) revert InvalidStakingPeriod();
        // Ensure the start time is in the future
        if (poolStartTime < block.timestamp) revert InvalidStartTime();
        // Ensure the lockup periods are valid
        if (unstakeLockup > poolEndTime || claimLockup > poolEndTime)
            revert InvalidLockupTime();

        // Initialize pool parameters
        pool.stakeToken = IERC20(stakeToken);
        pool.rewardToken = IERC20(rewardToken);
        pool.rewardTokenPerSecond = rewardTokenPerSecond;
        pool.lastRewardTimestamp = poolStartTime;
        pool.startTime = poolStartTime;
        pool.endTime = poolEndTime;
        pool.unstakeLockupTime = unstakeLockup;
        pool.claimLockupTime = claimLockup;
        pool.adminWallet = adminAddress;
    }

    /**
     * @dev See {IERC20BasePool-stake}.
     */
    function stake(uint256 amount) external validPool {
        // Ensure the amount to stake is not zero
        if (amount == 0) revert InvalidAmount();
        // Update the pool
        _updatePool();
        // Get user information
        User storage user = userInfo[msg.sender];
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
        pool.stakeToken.safeTransferFrom(msg.sender, address(this), amount);
        // Emit stake event
        emit Stake(msg.sender, amount);
    }

    /**
     * @dev See {IERC20BasePool-unstake}.
     */
    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        // Check if the current timestamp is before the unstake lockup time
        if (block.timestamp < pool.unstakeLockupTime)
            revert TokensInLockup(block.timestamp, pool.unstakeLockupTime);
        // Get user information
        User storage user = userInfo[msg.sender];
        uint256 currentAmount = user.amount;
        // Ensure the user has enough staked tokens
        if (currentAmount < amount) revert InsufficientAmount(currentAmount, amount);
        // Update the pool
        _updatePool();
        // Get accumulated rewards per share
        uint256 share = pool.accRewardPerShare;
        // Calculate pending rewards
        user.pending += ((currentAmount * share) / PRECISION_FACTOR) - user.rewardDebt;
        // Update user data
        unchecked {
            user.amount -= amount;
        }
        user.rewardDebt = (user.amount * share) / PRECISION_FACTOR;
        // Update total staked amount
        pool.totalStaked -= amount;
        // Transfer tokens from contract to user
        pool.stakeToken.safeTransfer(msg.sender, amount);
        // Emit unstake event
        emit Unstake(msg.sender, amount);
    }

    /**
     * @dev See {IERC20BasePool-claim}.
     */
    function claim() external nonReentrant {
        // Check if the current timestamp is before the claim lockup time
        if (block.timestamp < pool.claimLockupTime)
            revert TokensInLockup(block.timestamp, pool.claimLockupTime);
        // Update the pool
        _updatePool();
        // Get user information
        User storage user = userInfo[msg.sender];
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

    /**
     * @dev See {IERC20BasePool-pendingRewards}.
     */
    function pendingRewards(
        address userAddress
    ) external view returns (uint256) {
        // Get user information
        User storage user = userInfo[userAddress];
        uint256 share = pool.accRewardPerShare;
        // Update accumulated rewards per share if necessary
        if (
            block.timestamp > pool.lastRewardTimestamp && pool.totalStaked != 0
        ) {
            uint256 elapsedPeriod = _getMultiplier(
                pool.lastRewardTimestamp,
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
        // Update accumulated rewards per share if necessary
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
