// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

/// @title LockUp Factory Interface
/// @notice Defines the structures used in the LockUp type staking factories.
interface ILockUpFactory {
    /// @notice Deployment data for creating a new LockUp staking pool.
    /// @param stakeToken Address of the token to be staked.
    /// @param rewardToken Address of the token to be rewarded.
    /// @param poolStartTime Start time of the staking pool.
    /// @param poolEndTime End time of the staking pool.
    /// @param rewardPerSecond Rewards distributed per second.
    /// @param unstakeLockUpTime LockUp period for unstaking.
    /// @param claimLockUpTime LockUp period for claiming rewards.
    struct DeploymentData {
        address stakeToken;
        address rewardToken;
        uint256 poolStartTime;
        uint256 poolEndTime;
        uint256 rewardPerSecond;
        uint256 unstakeLockUpTime; // LockUp period for unstaking
        uint256 claimLockUpTime; // LockUp period for claiming rewards
    }
}
