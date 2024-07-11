/*
RequestManager
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;

import {IRequestManager} from "./interfaces/IRequestManager.sol";
import {IGenericFactory} from "./interfaces/IFactories/IGenericFactory.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title RequestManager
contract RequestManager is Ownable, IRequestManager {
    using SafeERC20 for IERC20;

    address[] public stakingPools;
    Request[] public requests;
    mapping(address factory => bool whitelisted) public whitelistFactory;
    mapping(uint256 id => address pool) public poolById;

    constructor() Ownable(msg.sender) {}

    function addFactory(address factory) external onlyOwner {
        if (factory == address(0) || factory == address(this)) revert InvalidAddress();
        if (whitelistFactory[factory]) revert AlreadyRegisteredFactory();
        whitelistFactory[factory] = true;
        emit FactoryRegistered(factory);
    }

    function removeFactory(address factory) external onlyOwner {
        if (!whitelistFactory[factory]) revert UnregisteredFactory();
        whitelistFactory[factory] = false;
        emit FactoryUnregistered(factory);
    }

    /**
     * @dev See {IRequestManager-deploy}
     */
    function deploy(uint256 id) external {
        if (requests.length <= id) revert InvalidId();
        Request memory req = requests[id];
        if (req.requestStatus != Status.APPROVED) revert InvalidRequestStatus();
        if (msg.sender != req.data.deployer) revert InvalidDeployer();
        requests[id].requestStatus = Status.DEPLOYED;
        address newPoolAddress = IGenericFactory(req.data.factory).deploy(
            req.data.deployer,
            req.data.stakingData
        );
        stakingPools.push(newPoolAddress);
        poolById[id] = newPoolAddress;
        emit RequestFullfilled(id, newPoolAddress);
    }

    /**
     * @dev See {IRequestManager-requestDeployment}
     */
    function requestDeployment(RequestPayload calldata data) external {
        if (data.deployer == address(0) || data.factory == address(0))
            revert InvalidAddress();
        if (data.ipfsHash == bytes32(0)) revert IpfsZeroHash();
        if (data.stakingData.length == 0) revert EmptyPayload();
        if (!whitelistFactory[data.factory]) revert UnregisteredFactory();
        requests.push(Request({requestStatus: Status.CREATED, data: data}));
        emit RequestSubmitted(requests.length - 1, data);
    }

    /**
     * @dev See {IRequestManager-approveRequest}
     */
    function approveRequest(uint256 id) external onlyOwner {
        if (requests.length <= id) revert InvalidId();
        Request storage req = requests[id];
        if (req.requestStatus != Status.CREATED) revert InvalidRequestStatus();
        req.requestStatus = Status.APPROVED;
        emit RequestStatusChanged(id, req.requestStatus);
    }

    /**
     * @dev See {IRequestManager-denyRequest}
     */
    function denyRequest(uint256 id) external onlyOwner {
        if (requests.length <= id) revert InvalidId();
        Request storage req = requests[id];
        if (req.requestStatus != Status.CREATED) revert InvalidRequestStatus();
        req.requestStatus = Status.DENIED;
        emit RequestStatusChanged(id, req.requestStatus);
    }

    /**
     * @dev See {IRequestManager-cancelRequest}
     */
    function cancelRequest(uint256 id) external {
        if (requests.length <= id) revert InvalidId();
        Request storage req = requests[id];
        if (msg.sender != req.data.deployer) revert InvalidDeployer();
        if (
            req.requestStatus != Status.CREATED &&
            req.requestStatus != Status.APPROVED
        ) revert InvalidRequestStatus();
        req.requestStatus = Status.CANCELED;
        emit RequestStatusChanged(id, req.requestStatus);
    }

    /// @notice Returns all deployment requests.
    /// @return reqs Array of all PenaltyFee requests.
    function getRequests() external view returns (Request[] memory reqs) {
        reqs = requests;
    }

    /// @notice Returns all deployed staking pools.
    /// @return pools Array of all staking pool addresses.
    function getPools() external view returns (address[] memory pools) {
        pools = stakingPools;
    }
}
