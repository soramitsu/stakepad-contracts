// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

/// @title Base Factory Interface
/// @notice Defines the basic structures and events for the factory.
/// @dev This interface is used as a base for other specific factory interfaces.
interface IBaseFactory {
    /// @notice Status of the staking pool request.
    enum Status {
        UNKNOWN,
        CREATED,
        DENIED,
        APPROVED,
        DEPLOYED,
        CANCELED
    }

    /// @notice Information about a staking pool request.
    /// @param ipfsHash IPFS hash of the request data.
    /// @param deployer Address of the deployer.
    /// @param requestStatus Current status of the request.
    struct RequestInfo {
        bytes32 ipfsHash;
        address deployer;
        Status requestStatus;
    }

    /// @notice Thrown when an invalid ID is used.
    error InvalidId();

    /// @notice Thrown when the request status is invalid.
    error InvalidRequestStatus();

    /// @notice Thrown when the caller is not authorized.
    error InvalidCaller();

    /// @notice Thrown when the token address is invalid.
    error InvalidTokenAddress();

    /// @notice Emitted when a new staking pool is deployed.
    /// @param stakingAddress Address of the deployed staking pool.
    /// @param id ID of the request.
    event StakingPoolDeployed(
        address indexed stakingAddress,
        uint256 indexed id
    );

    /// @notice Emitted when the status of a request changes.
    /// @param id ID of the request.
    /// @param status New status of the request.
    event RequestStatusChanged(uint256 indexed id, Status indexed status);
}