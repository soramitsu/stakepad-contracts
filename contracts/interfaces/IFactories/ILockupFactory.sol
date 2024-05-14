// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;
import {IBaseFactory} from "./IBaseFactory.sol";

interface ILockupFactory is IBaseFactory {
    
    struct DeploymentData {
        address stakeToken;
        address rewardToken;
        uint256 poolStartTime;
        uint256 poolEndTime;
        uint256 unstakeLockupTime; // Lockup period for unstaking
        uint256 claimLockupTime; // Lockup period for claiming rewards
        uint256 rewardPerSecond;
    }

    struct Request {
        address deployer;
        Status requestStatus;
        DeploymentData data;
    }

    event RequestSubmitted(uint256 indexed id, address indexed deployer, Status indexed status, DeploymentData data);
    event StakingPoolDeployed(address indexed stakingAddress, uint256 indexed id);
}