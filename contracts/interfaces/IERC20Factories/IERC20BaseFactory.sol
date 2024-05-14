// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

interface IERC20BaseFactory {
    enum Status {
        UNKNOWN,
        CREATED,
        DENIED,
        APPROVED,
        DEPLOYED,
        CANCELED
    }
    error InvalidId();
    error InvalidRequestStatus();
    error InvalidCaller();
    error InvalidTokenAddress();
    error InvalidRewardRate();
    
    event RequestStatusChanged(uint256 indexed id, Status indexed status);
}