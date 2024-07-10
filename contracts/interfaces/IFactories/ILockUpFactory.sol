// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;
import {IBaseFactory} from "./IBaseFactory.sol";

/// @title LockUp Factory Interface
/// @notice Defines the structures and events for the LockUp staking pools.
/// @dev This interface extends the IBaseFactory interface.
interface ILockUpFactory is IBaseFactory {
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
        uint256 unstakeLockUpTime;
        uint256 claimLockUpTime;
    }

    /// @notice LockUp request data structure.
    /// @param info Basic request information.
    /// @param data Deployment data for the LockUp pool.
    struct LockUpRequest {
        RequestInfo info;
        DeploymentData data;
    }

    /// @notice Emitted when a new request is submitted.
    /// @param id ID of the request.
    /// @param deployer Address of the deployer.
    /// @param status Current status of the request.
    /// @param data Deployment data for the LockUp pool.
    event RequestSubmitted(
        uint256 indexed id,
        address indexed deployer,
        Status indexed status,
        DeploymentData data
    );
}