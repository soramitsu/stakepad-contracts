// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

/// @title Penalty Fee Factory Interface
/// @notice Defines the structures used in the Penalty Fee type staking factories.
interface IPenaltyFeeFactory {
    /// @notice Deployment data for creating a new Penalty Fee staking pool.
    /// @param stakeToken Address of the token to be staked.
    /// @param rewardToken Address of the token to be rewarded.
    /// @param poolStartTime Start time of the staking pool.
    /// @param poolEndTime End time of the staking pool.
    /// @param rewardPerSecond Rewards distributed per second.
    /// @param penaltyPeriod Penalty period for early unstaking.
    struct DeploymentData {
        address stakeToken;
        address rewardToken;
        uint256 poolStartTime;
        uint256 poolEndTime;
        uint256 rewardPerSecond;
        uint256 penaltyPeriod;
    }
}
