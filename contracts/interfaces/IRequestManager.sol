// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

interface IRequestManager {
    enum Status {
        UNKNOWN,
        CREATED,
        DENIED,
        APPROVED,
        DEPLOYED,
        CANCELED
    }

    struct RequestPayload {
        bytes32 ipfsHash;
        address deployer;
        address factory;
        bytes stakingData;
    }

    struct Request {
        Status requestStatus;
        RequestPayload data;
    }

    error InvalidId();
    error InvalidRequestStatus();
    error InvalidCaller();
    error InvalidIpfsHash();
    error InvalidAddress();
    error InvalidPayload();
    error UnregisteredFactory();
    error FactoryAlreadyRegistered();

    event RequestStatusChanged(uint256 indexed id, Status indexed status);
    event RequestFullfilled(uint256 indexed id, address indexed poolAddress);

    event RequestSubmitted(
        uint256 indexed id,
        RequestPayload data
    );

    event FactoryRegistered(address indexed factory);
    event FactoryUnregistered(address indexed factory);

    function requestDeployment(RequestPayload calldata data) external;
    function approveRequest(uint256 id) external;
    function denyRequest(uint256 id) external;
    function cancelRequest(uint256 id) external;
}
