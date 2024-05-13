// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;
import {IERC20BaseFactory} from "./IERC20BaseFactory.sol";

interface IERC20PenaltyFeeFactory is IERC20BaseFactory {
    
    struct DeploymentData {
        address stakeToken;
        address rewardToken;
        uint256 rewardPerSecond;
        uint256 poolStartTime;
        uint256 poolEndTime;
        uint256 penaltyPeriod;
    }

    struct Request {
        address deployer;
        Status requestStatus;
        DeploymentData data;
    }

    event RequestSubmitted(uint256 indexed id, address indexed deployer, Status indexed status, DeploymentData data);
    event StakingPoolDeployed(address indexed stakingAddress, uint256 indexed id);
}