// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

interface IPenaltyFeeFactory {
    struct DeploymentData {
        address stakeToken;
        address rewardToken;
        uint256 poolStartTime;
        uint256 poolEndTime;
        uint256 rewardPerSecond;
        uint256 penaltyPeriod;
    }
}
