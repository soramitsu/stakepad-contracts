// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;
import {IBaseFactory} from "./IBaseFactory.sol";

interface INoLockUpFactory is IBaseFactory {
    
    struct DeploymentData {
        address stakeToken;
        address rewardToken;
        uint256 rewardPerSecond;
        uint256 poolStartTime;
        uint256 poolEndTime;
    }

    struct Request {
        address deployer;
        Status requestStatus;
        DeploymentData data;
    }

    event RequestSubmitted(uint256 indexed id, address indexed deployer, Status indexed status, DeploymentData data);
    event StakingPoolDeployed(address indexed stakingAddress, uint256 indexed id);
}