// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;
import {IBaseFactory} from "./IBaseFactory.sol";

/// @title Penalty Fee Factory Interface
/// @notice Defines the structures and events for the Penalty Fee staking pools.
/// @dev This interface extends the IBaseFactory interface.
interface IPenaltyFeeFactory is IBaseFactory {
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

    /// @notice Penalty Fee request data structure.
    /// @param info Basic request information.
    /// @param data Deployment data for the Penalty Fee pool.
    struct PenaltyFeeRequest {
        RequestInfo info;
        DeploymentData data;
    }

    /// @notice Emitted when a new request is submitted.
    /// @param id ID of the request.
    /// @param deployer Address of the deployer.
    /// @param status Current status of the request.
    /// @param data Deployment data for the Penalty Fee pool.
    event RequestSubmitted(
        uint256 indexed id,
        address indexed deployer,
        Status indexed status,
        DeploymentData data
    );
}