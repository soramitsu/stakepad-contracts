// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

interface IRequestManager {

    /// @notice Defines a request statuses
    enum Status {
        UNKNOWN,
        CREATED,
        DENIED,
        APPROVED,
        DEPLOYED,
        CANCELED
    }

    /**
     * @notice Defines the submitted request payload parameters
     * @dev ipfsHash IPFS hash of submitted project data  
     * @dev deployer Address of the deployer
     * @dev factory Address of the factory to be used for deployment
     * @dev stakingData Encoded staking pool deployment parameters
     */
    struct RequestPayload {
        bytes32 ipfsHash;
        address deployer;
        address factory;
        bytes stakingData;
    }

    /**
    * @notice Information about a staking pool request.
    * @param requestStatus Current status of the request.
    * @param data See {RequestPayload} above.
    */
    struct Request {
        Status requestStatus;
        RequestPayload data;
    }

    /// @notice Thrown when an invalid ID is used.
    error InvalidId();

    /// @notice Thrown when the request status is invalid.
    error InvalidRequestStatus();

    /// @notice Thrown when the caller is not authorized.
    error InvalidDeployer();

    /// @notice Thrown when the IPFS hash is zero.
    error IpfsZeroHash();

    /// @notice Thrown when the token address is invalid.
    error InvalidAddress();

    /// @notice Thrown when the {stakingData} payload param is emty.
    error EmptyPayload();
    error UnregisteredFactory();
    error AlreadyRegisteredFactory();

    event RequestStatusChanged(uint256 indexed id, Status indexed status);
    event RequestFullfilled(uint256 indexed id, address indexed poolAddress);

    event RequestSubmitted(uint256 indexed id, RequestPayload data);

    event FactoryRegistered(address indexed factory);
    event FactoryUnregistered(address indexed factory);

    /**
     * @notice Deploys a new staking pool.
     * @dev Request with the `id` MUST be approved by an admin.
     * @param id ID of the request to be deployed.
     */
    function deploy(uint256 id) external;

    /**
     * @notice Requests deployment of a new staking pool.
     * @dev See 'RequestPayload' struct.
     * @param data Request data for the staking pool.
     */
    function requestDeployment(RequestPayload calldata data) external;

    /**
     * @notice Approves submitted deployment request.
     * @dev Can be called ONLY by admin.
     * @dev Request can not be approved if afready approved, canceled, denied or deployed.
     * @param id ID of the request to be approved.
     */
    function approveRequest(uint256 id) external;

    /**
     * @notice Denies a deployment request.
     * @dev Can be called ONLY by admin.
     * @dev Request can not be denied if afready approved, canceled, denied or deployed.
     * @param id ID of the request to be denied.
     */
    function denyRequest(uint256 id) external;

    /**
     * @notice Cancels a deployment request.
     * @dev Request can not be canceled if afready canceled, denied or deployed.
     * @param id ID of the request to be canceled.
     */
    function cancelRequest(uint256 id) external;
}
