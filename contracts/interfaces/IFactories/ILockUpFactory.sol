// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;
import {IBaseFactory} from "./IBaseFactory.sol";

interface ILockUpFactory is IBaseFactory {
    struct DeploymentData {
        address stakeToken;
        address rewardToken;
        uint256 poolStartTime;
        uint256 poolEndTime;
        uint256 unstakeLockUpTime; // LockUp period for unstaking
        uint256 claimLockUpTime; // LockUp period for claiming rewards
        uint256 rewardPerSecond;
    }

    struct LockUpRequest {
        RequestInfo info;
        DeploymentData data;
    }

    event RequestSubmitted(
        uint256 indexed id,
        address indexed deployer,
        Status indexed status,
        DeploymentData data
    );
}
