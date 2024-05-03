// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

interface IERC20BasePool {
    struct BaseUserInfo {
        uint256 amount; // Amount of tokens staked
        uint256 claimed; // Amount of claimed rewards
        uint256 rewardDebt; // Reward debt
        uint256 pending; // Pending rewards
    }

    struct BasePoolInfo {
        address stakeToken; // ERC20 token being staked
        address rewardToken; // ERC20 token used for rewards
        uint256 startTime; // Start time of the staking pool
        uint256 endTime; // End time of the staking pool
        uint256 rewardTokenPerSecond; // Rate of rewards per second
        uint256 totalStaked; // Total amount of tokens staked
        uint256 totalClaimed; // Total amount of claimed rewards
        uint256 lastRewardTimestamp; // Timestamp of the last reward update
        uint256 accRewardPerShare; // Accumulated rewards per share
        bool isActive; // Flag indicating if the pool is active
        address adminWallet; // Address of the admin
    }

    /**
     *  ERROR MESSAGES
     */

    /// @dev Error to indicate an invalid staking period
    error InvalidStakingPeriod();

    /// @dev Error to indicate an invalid start time for the staking pool
    error InvalidStartTime();

    /// @dev Error to indicate an invalid input amount for the staking and unstaking operations in the pool
    error InvalidAmount();

    /// @dev Error to indicate insufficient amount of tokens
    /// @param reqAmount The amount of tokens that is required
    /// @param currentAmount The current amount of tokens
    error InsufficientAmount(uint256 reqAmount, uint256 currentAmount);

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

    /**
     *  EVENTS
     */

    /**
     * @notice Event to notify when a user stakes tokens
     * @dev Emmited in 'stake' function
     * @param user The address of the user who stakes tokens
     * @param amount The amount of tokens staked
     */
    event Stake(address user, uint256 amount);

    /**
     * @notice Event to notify when a user unstakes tokens
     * @dev Emmited in 'unstake' function
     * @param user The address of the user who unstakes tokens
     * @param amount The amount of tokens unstaked
     */
    event Unstake(address user, uint256 amount);

    /**
     * @notice Event to notify when a user claims rewards
     * @dev Emmited in 'claim' function
     * @param user The address of the user who claims rewards
     * @param amount The amount of rewards claimed
     */
    event Claim(address user, uint256 amount);

    /**
     * @notice Event to notify when the staking pool is activated by the admin team
     * @dev Emmited in 'activate' function
     * @param rewardAmount The amount of rewards allocated to the pool
     */
    event ActivatePool(uint256 rewardAmount);

    /**
     * @notice Event to notify when the staking pool is updated
     * @dev Emmited in '_updatePool' function
     * @param totalStaked The total amount of tokens staked in the pool
     * @param accumulatedRewardTokenPerShare The accumulated rewards per share
     * @param lastBlockNumber The timestamp of the last block with any user operation
     */
    event UpdatePool(
        uint256 totalStaked,
        uint256 accumulatedRewardTokenPerShare,
        uint256 lastBlockNumber
    );

    /**
     *  FUNCTIONS
     */

    /**
     * @notice Function to allow users to stake tokens into the pool
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) external;

    /**
     * @notice Function to allow users to unstake tokens from the pool
     * @param amount Amount of tokens to stake
     */
    function unstake(uint256 amount) external;

    /**
     * @notice Function to allow users to claim pending rewards
     */
    function claim() external;

    /**
     * @notice Function to calculate pending rewards for a user
     * @param userAddress Address of the user
     * @return pending rewards
     */
    function pendingRewards(
        address userAddress
    ) external view returns (uint256);

    /**
     * @notice Function to activate the staking pool
     * @dev Protected by onlyAdmin modifier. Only platform admin can activate pools
     */
    function activate() external;
}
