// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

// Import OpenZeppelin contracts for ERC20 token interaction, reentrancy protection, safe token transfers, and ownership management.
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC20LockUpStakingPool
/// @notice A smart contract for staking ERC20 tokens and earning rewards over a specified period.
contract ERC20LockUpStakingPool is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @dev Precision factor for calculations
    uint256 public constant PRECISION_FACTOR = 10e18;

    // Error messages
    /// @dev Error to indicate an invalid staking period
    error InvalidStakingPeriod();

    /// @dev Error to indicate an invalid start time for the staking pool
    error InvalidStartTime();

    /// @dev Error to indicate an invalid lockup time for unstaking or claiming rewards
    error InvalidLockupTime();

    /// @dev Error to indicate an invalid input amount for the staking and unstaking operations in the pool
    error InvalidAmount();

    /// @dev Error to indicate insufficient amount of tokens
    /// @param amount The amount of tokens that is insufficient
    error InsufficientAmount(uint256 amount);

    /// @dev Error to indicate that tokens are still in lockup and cannot be accessed
    /// @param currentTime The current timestamp
    /// @param unlockTime The timestamp when the tokens will be unlocked
    error TokensInLockup(uint256 currentTime, uint256 unlockTime);

    /// @dev Error to indicate that the user has no available rewards to claim
    error NothingToClaim();

    /// @dev Error to indicate that the staking pool has not started yet
    error PoolNotStarted();

    /// @dev Error to indicate that the staking pool has already ended
    error PoolHasEnded();

    /// @dev Error to indicate that the staking pool is not active
    error PoolNotActive();

    /// @dev Error to indicate that the staking pool is already active
    error PoolIsActive();

    /// @dev Error to indicate that the caller is not the admin
    error NotAdmin();

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
        mapping(address => User) userInfo; // Mapping to store user-specific staking information
    }
    Pool public pool; // Public pool variable to access pool data

    // Events
    /// @notice Event to notify when a user stakes tokens
    /// @param user The address of the user who stakes tokens
    /// @param amount The amount of tokens staked
    event Stake(address user, uint256 amount);

    /// @notice Event to notify when a user unstakes tokens
    /// @param user The address of the user who unstakes tokens
    /// @param amount The amount of tokens unstaked
    event Unstake(address user, uint256 amount);

    /// @notice Event to notify when a user claims rewards
    /// @param user The address of the user who claims rewards
    /// @param amount The amount of rewards claimed
    event Claim(address user, uint256 amount);

    /// @notice Event to notify when the staking pool is activated
    /// @param rewardAmount The amount of rewards allocated to the pool
    event ActivatePool(uint256 rewardAmount);

    /// @notice Event to notify when the staking pool is updated
    /// @param totalStaked The total amount of tokens staked in the pool
    /// @param accumulatedRewardTokenPerShare The accumulated rewards per share
    /// @param lastBlockNumber The timestamp of the last block
    event UpdatePool(
        uint256 totalStaked,
        uint256 accumulatedRewardTokenPerShare,
        uint256 lastBlockNumber
    );

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

    /// @notice Function to allow users to stake tokens into the pool
    /// @param _amount Amount of tokens to stake
    function stake(uint256 _amount) external validPool {
        // Ensure the amount to stake is not zero
        if (_amount == 0) revert InvalidAmount();

        // Update the pool
        _updatePool();

        // Get user information
        User storage user = pool.userInfo[msg.sender];
        uint256 share = pool.accRewardPerShare;
        uint256 amount = user.amount;

        // Calculate pending rewards
        if (amount > 0) {
            user.pending +=
                (amount * share) /
                PRECISION_FACTOR -
                user.rewardDebt;
        }

        // Update user data
        unchecked {
            user.amount = amount + _amount;
        }
        user.rewardDebt = (user.amount * share) / PRECISION_FACTOR;

        // Update total staked amount
        pool.totalStaked += _amount;

        // Transfer tokens from user to contract
        pool.stakeToken.safeTransferFrom(msg.sender, address(this), _amount);

        // Emit stake event
        emit Stake(msg.sender, _amount);
    }

    /// @notice Function to allow users to unstake tokens from the pool
    /// @param _amount Amount of tokens to unstake
    function unstake(uint256 _amount) external nonReentrant {
        if (_amount == 0) revert InvalidAmount();
        // Check if the current timestamp is before the unstake lockup time
        if (block.timestamp < pool.unstakeLockupTime)
            revert TokensInLockup(block.timestamp, pool.unstakeLockupTime);

        // Get user information
        User storage user = pool.userInfo[msg.sender];
        uint256 amount = user.amount;

        // Ensure the user has enough staked tokens
        if (amount < _amount) revert InsufficientAmount(amount);

        // Update the pool
        _updatePool();

        // Get accumulated rewards per share
        uint256 share = pool.accRewardPerShare;

        // Calculate pending rewards
        user.pending += ((amount * share) / PRECISION_FACTOR) - user.rewardDebt;

        // Update user data
        unchecked {
            user.amount -= _amount;
        }
        user.rewardDebt = (user.amount * share) / PRECISION_FACTOR;

        // Update total staked amount
        pool.totalStaked -= _amount;

        // Transfer tokens from contract to user
        pool.stakeToken.safeTransfer(msg.sender, _amount);

        // Emit unstake event
        emit Unstake(msg.sender, _amount);
    }

    /// @notice Function to allow users to claim pending rewards
    function claim() external nonReentrant {
        // Check if the current timestamp is before the claim lockup time
        if (block.timestamp < pool.claimLockupTime)
            revert TokensInLockup(block.timestamp, pool.claimLockupTime);

        // Update the pool
        _updatePool();

        // Get user information
        User storage user = pool.userInfo[msg.sender];
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
     * @notice Function to calculate pending rewards for a user
     * @param userAddress Address of the user
     * @return pending rewards
     */
    function pendingRewards(
        address userAddress
    ) external view returns (uint256) {
        // Get user information
        User storage user = pool.userInfo[userAddress];
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
     * @notice Function to get user-specific staking information
     * @param user Address of the user
     * @return userInfo User information
     */
    function getUserInfo(
        address user
    ) external view returns (User memory userInfo) {
        // Get user information
        userInfo = pool.userInfo[user];
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
