// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

interface IBaseFactory {
    enum Status {
        UNKNOWN,
        CREATED,
        DENIED,
        APPROVED,
        DEPLOYED,
        CANCELED
    }
    struct RequestInfo {
        bytes32 ipfsHash;
        address deployer;
        Status requestStatus;
    }

    error InvalidId();
    error InvalidRequestStatus();
    error InvalidCaller();
    error InvalidTokenAddress();
    error InvalidRewardRate();
    
    event StakingPoolDeployed(address indexed stakingAddress, uint256 indexed id);
    event RequestStatusChanged(uint256 indexed id, Status indexed status);
}