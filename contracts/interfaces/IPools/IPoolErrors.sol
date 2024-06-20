// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

interface IPoolErrors {
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

    /// @dev Error to indicate an invalid reward rate for the staking
    error InvalidRewardRate();

    /// @dev Error to indicate that tokens are still in LockUp and cannot be accessed
    /// @param currentTime The current timestamp
    /// @param unlockTime The timestamp when the tokens will be unlocked
    error TokensInLockUp(uint256 currentTime, uint256 unlockTime);

    /// @dev Error to indicate an invalid LockUp time for unstaking or claiming rewards
    error InvalidLockUpTime();

    /**
     * @notice Error emitted when a user other than the owner of a token attempts to unstake it.
     */
    error NotStaker();

    /// @dev Error to indicate an invalid penalty duration for unstaking
    error InvalidPenaltyPeriod();
    /// @dev Error to indicate that the caller is not the admin
    error NotAdmin();
}
