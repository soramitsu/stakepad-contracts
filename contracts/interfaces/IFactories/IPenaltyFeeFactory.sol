// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;
import {IBaseFactory} from "./IBaseFactory.sol";

interface IPenaltyFeeFactory is IBaseFactory {
    
    struct DeploymentData {
        address stakeToken;
        address rewardToken;
        uint256 poolStartTime;
        uint256 poolEndTime;
        uint256 penaltyPeriod;
        uint256 rewardPerSecond;
    }

    struct PenaltyFeeRequest {
        RequestInfo info;
        DeploymentData data;
    }

    event RequestSubmitted(uint256 indexed id, address indexed deployer, Status indexed status, DeploymentData data);
}