// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

interface IERC20BaseFactory {
    enum Status {
        UNKNOWN,
        CREATED,
        DENIED,
        APROVED,
        DEPLOYED,
        CANCELED
    }

    struct BaseDeploymentData {
        address stakeToken;
        address rewardToken;
        uint256 rewardPerSecond;
        uint256 poolStartTime;
        uint256 poolEndTime;
    }
    event CreateStakingPool(address indexed stakingAddress, address indexed stakeToken, address indexed rewardToken, uint256 rewardPerSecond, uint256 startTime, uint256 endTime, address owner);
}