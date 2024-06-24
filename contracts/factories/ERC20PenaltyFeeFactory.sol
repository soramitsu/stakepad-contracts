/*
ERC20LockUpFactory
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {ERC20PenaltyFeePool} from "../pools/ERC20/ERC20PenaltyFeePool.sol";
import {IPenaltyFeeFactory} from "../interfaces/IFactories/IPenaltyFeeFactory.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ERC20PenaltyFeeStakingFactory
/// @notice A smart contract for deploying ERC20 staking pools with penalty fees.
/// @author Ayooluwa Akindeko, Soramitsu team
contract ERC20PenaltyFeeStakingFactory is Ownable, IPenaltyFeeFactory {
    using SafeERC20 for IERC20;

    address[] public stakingPools;
    PenaltyFeeRequest[] public requests;
    mapping(uint256 id => address pool) public poolById;

    constructor() Ownable(msg.sender) {}

    /// @notice Function allows users to deploy the penaltyFee staking pool with specified parameters
     function deploy(uint256 id) public returns (address newPoolAddress) {
        if (requests.length < id) revert InvalidId();
        PenaltyFeeRequest memory req = requests[id];
        if (req.info.requestStatus != Status.APPROVED) revert InvalidRequestStatus();
        if (msg.sender != req.info.deployer) revert InvalidCaller();
        newPoolAddress = address(
            new ERC20PenaltyFeePool{
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
                req.data.rewardPerSecond,
                req.data.poolStartTime,
                req.data.poolEndTime,
                req.data.penaltyPeriod,
                owner()
            )
        );
        stakingPools.push(newPoolAddress);
        requests[id].info.requestStatus = Status.DEPLOYED;
        poolById[id] = newPoolAddress;
        uint256 rewardAmount = (req.data.poolEndTime - req.data.poolStartTime) *
            req.data.rewardPerSecond;
        ERC20PenaltyFeePool(newPoolAddress).transferOwnership(msg.sender);
        // Transfer reward tokens from the owner to the contract
        // slither-disable-next-line arbitrary-send-erc20
        IERC20(req.data.rewardToken).safeTransferFrom(
            msg.sender,
            newPoolAddress,
            rewardAmount
        );
        emit StakingPoolDeployed(newPoolAddress, id);
    }

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

    function approveRequest(uint256 id) external onlyOwner {
        if (requests.length <= id) revert InvalidId();
        PenaltyFeeRequest storage req = requests[id];
        if (req.info.requestStatus != Status.CREATED) revert InvalidRequestStatus();
        req.info.requestStatus = Status.APPROVED;
        emit RequestStatusChanged(id, req.info.requestStatus);
    }

    function denyRequest(uint256 id) external onlyOwner {
        if (requests.length <= id) revert InvalidId();
        PenaltyFeeRequest storage req = requests[id];
        if (req.info.requestStatus != Status.CREATED) revert InvalidRequestStatus();
        req.info.requestStatus = Status.DENIED;
        emit RequestStatusChanged(id, req.info.requestStatus);
    }

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

    function getRequests() external view returns (PenaltyFeeRequest[] memory reqs) {
        reqs = requests;
    }

    function getPools() external view returns (address[] memory pools) {
        pools = stakingPools;
    }
}
