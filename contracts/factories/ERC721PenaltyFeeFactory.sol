/*
ERC20LockUpFactory
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {ERC721PenaltyFeePool} from "../pools/ERC721/ERC721PenaltyFeePool.sol";
import {IPenaltyFeeFactory} from "../interfaces/IFactories/IPenaltyFeeFactory.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ERC721PenaltyFeeStakingFactory
/// @notice A smart contract for deploying ERC721 staking pools with penalty fees.
/// @dev This contract uses Ownable for ownership and IPenaltyFeeFactory for factory functionality.
/// @author Ayooluwa Akindeko, Soramitsu team
contract ERC721PenaltyFeeStakingFactory is Ownable, IPenaltyFeeFactory {
    using SafeERC20 for IERC20;

    /// @notice Array to store addresses of deployed staking pools.
    address[] public stakingPools;

    /// @notice Array to store requests for staking pools.
    PenaltyFeeRequest[] public requests;

    /// @notice Mapping to store pool address by request ID.
    mapping(uint256 id => address pool) public poolById;

    /// @notice Constructor sets the owner of the contract.
    constructor() Ownable(msg.sender) {}

    /// @notice Function allows users to deploy the penaltyFee staking pool with specified parameters.
    /// @param id ID of the request to be deployed.
    /// @return newPoolAddress Address of the newly deployed staking pool.
    function deploy(uint256 id) public returns (address newPoolAddress) {
        if (requests.length < id) revert InvalidId();
        PenaltyFeeRequest memory req = requests[id];
        if (req.info.requestStatus != Status.APPROVED) revert InvalidRequestStatus();
        if (msg.sender != req.info.deployer) revert InvalidCaller();
        newPoolAddress = address(
            new ERC721PenaltyFeePool{
                salt: keccak256(
                    abi.encode(
                        req.data.stakeToken,
                        req.data.rewardToken,
                        req.data.rewardPerSecond,
                        req.data.poolStartTime,
                        req.data.poolEndTime
                    )
                )
            }(
                req.data.stakeToken,
                req.data.rewardToken,
                req.data.poolStartTime,
                req.data.poolEndTime,
                req.data.rewardPerSecond,
                req.data.penaltyPeriod,
                owner()
            )
        );
        stakingPools.push(newPoolAddress);
        requests[id].info.requestStatus = Status.DEPLOYED;
        poolById[id] = newPoolAddress;
        uint256 rewardAmount = (req.data.poolEndTime - req.data.poolStartTime) *
            req.data.rewardPerSecond;
        ERC721PenaltyFeePool(newPoolAddress).transferOwnership(msg.sender);
        // Transfer reward tokens from the owner to the contract
        // slither-disable-next-line arbitrary-send-erc20
        IERC20(req.data.rewardToken).safeTransferFrom(
            msg.sender,
            newPoolAddress,
            rewardAmount
        );
        emit StakingPoolDeployed(newPoolAddress, id);
    }

    /// @notice Requests deployment of a new PenaltyFee staking pool.
    /// @param ipfsHash IPFS hash of the request data.
    /// @param data Deployment data for the staking pool.
    function requestDeployment(bytes32 ipfsHash, DeploymentData calldata data) external {
        if (data.stakeToken == address(0) || data.rewardToken == address(0))
            revert InvalidTokenAddress();
        requests.push(
            PenaltyFeeRequest({
                info: RequestInfo({
                    ipfsHash: ipfsHash,
                    deployer: msg.sender,
                    requestStatus: Status.CREATED
                }),
                data: data
            })
        );
        emit RequestSubmitted(
            requests.length - 1,
            msg.sender,
            Status.CREATED,
            data
        );
    }

    /// @notice Approves a deployment request.
    /// @param id ID of the request to be approved.
    function approveRequest(uint256 id) external onlyOwner {
        if (requests.length <= id) revert InvalidId();
        PenaltyFeeRequest storage req = requests[id];
        if (req.info.requestStatus != Status.CREATED) revert InvalidRequestStatus();
        req.info.requestStatus = Status.APPROVED;
        emit RequestStatusChanged(id, req.info.requestStatus);
    }

    /// @notice Denies a deployment request.
    /// @param id ID of the request to be denied.
    function denyRequest(uint256 id) external onlyOwner {
        if (requests.length <= id) revert InvalidId();
        PenaltyFeeRequest storage req = requests[id];
        if (req.info.requestStatus != Status.CREATED) revert InvalidRequestStatus();
        req.info.requestStatus = Status.DENIED;
        emit RequestStatusChanged(id, req.info.requestStatus);
    }

    /// @notice Cancels a deployment request.
    /// @param id ID of the request to be canceled.
    function cancelRequest(uint256 id) external {
        if (requests.length <= id) revert InvalidId();
        PenaltyFeeRequest storage req = requests[id];
        if (msg.sender != req.info.deployer) revert InvalidCaller();
        if (
            req.info.requestStatus != Status.CREATED ||
            req.info.requestStatus != Status.APPROVED
        ) revert InvalidRequestStatus();
        req.info.requestStatus = Status.CANCELED;
        emit RequestStatusChanged(id, req.info.requestStatus);
    }

    /// @notice Returns all deployment requests.
    /// @return reqs Array of all PenaltyFee requests.
    function getRequests() external view returns (PenaltyFeeRequest[] memory reqs) {
        reqs = requests;
    }

    /// @notice Returns all deployed staking pools.
    /// @return pools Array of all staking pool addresses.
    function getPools() external view returns (address[] memory pools) {
        pools = stakingPools;
    }
}
