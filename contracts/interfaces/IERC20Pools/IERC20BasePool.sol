// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

interface IBasePoolERC20 {
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

    /**
     *  EVENTS
     */

    /**
     * @notice Event to notify when a user stakes tokens
     * @dev Emitted in 'stake' function
     * @param user The address of the user who stakes tokens
     * @param amount The amount of tokens staked
     */
    event Stake(address indexed user, uint256 amount);

    /**
     * @notice Event to notify when a user unstakes tokens
     * @dev Emitted in 'unstake' function
     * @param user The address of the user who unstakes tokens
     * @param amount The amount of tokens unstaked
     */
    event Unstake(address indexed user, uint256 amount);

    /**
     * @notice Event to notify when a user claims rewards
     * @dev Emitted in 'claim' function
     * @param user The address of the user who claims rewards
     * @param amount The amount of rewards claimed
     */
    event Claim(address indexed user, uint256 amount);

    /**
     * @notice Event to notify when the staking pool is updated
     * @dev Emitted in '_updatePool' function
     * @param totalStaked The total amount of tokens staked in the pool
     * @param accumulatedRewardTokenPerShare The accumulated rewards per share
     * @param lastBlockTimestamp The timestamp of the last block with any user operation
     */
    event UpdatePool(
        uint256 totalStaked,
        uint256 accumulatedRewardTokenPerShare,
        uint256 lastBlockTimestamp
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
}
