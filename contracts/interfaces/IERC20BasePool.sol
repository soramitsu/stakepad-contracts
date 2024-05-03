// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

interface IERC20BasePool {
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
    function pendingRewards(address userAddress) external view returns (uint256);
}
