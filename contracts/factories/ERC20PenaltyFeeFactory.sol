/*
ERC20LockUpFactory
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {ERC20PenaltyFeePool} from "../pools/ERC20PenaltyFeePool.sol";
import {IERC20PenaltyFeeFactory} from "../interfaces/IERC20Factories/IERC20PenaltyFeeFactory.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ERC20LockUpStakingFactory
/// @notice A smart contract for deploying ERC20 staking pools with penalty fees.
/// @author Ayooluwa Akindeko, Soramitsu team
contract ERC20PenaltyFeeStakingFactory is Ownable, IERC20PenaltyFeeFactory {
    using SafeERC20 for IERC20;

    address[] public stakingPools;
    Request[] public requests;
    mapping(uint256 id => address pool) public poolById;

    constructor() Ownable(msg.sender) {}

    /// @notice Function allows users to deploy the penaltyFee staking pool with specified parameters
     function deploy(uint256 id) public returns (address newPoolAddress) {
        if (requests.length < id) revert InvalidId();
        Request memory req = requests[id];
        if (req.requestStatus != Status.APPROVED) revert InvalidRequestStatus();
        if (msg.sender != req.deployer) revert InvalidCaller();
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
        ERC20PenaltyFeePool(newPoolAddress).transferOwnership(msg.sender);
        emit StakingPoolDeployed(newPoolAddress, id);
    }

    function requestDeployment(DeploymentData calldata data) external {
        if (data.stakeToken == address(0) || data.rewardToken == address(0))
            revert InvalidTokenAddress();
        if (data.rewardPerSecond == 0) revert InvalidRewardRate();
        requests.push(
            Request({
                deployer: msg.sender,
                requestStatus: Status.CREATED,
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
        if (requests.length < id) revert InvalidId();
        Request storage req = requests[id];
        if (req.requestStatus != Status.CREATED) revert InvalidRequestStatus();
        req.requestStatus = Status.APPROVED;
        emit RequestStatusChanged(id, req.requestStatus);
    }

    function denyRequest(uint256 id) external onlyOwner {
        if (requests.length < id) revert InvalidId();
        Request storage req = requests[id];
        if (req.requestStatus != Status.CREATED) revert InvalidRequestStatus();
        req.requestStatus = Status.DENIED;
        emit RequestStatusChanged(id, req.requestStatus);
    }

    function cancelRequest(uint256 id) external {
        if (requests.length < id) revert InvalidId();
        Request storage req = requests[id];
        if (msg.sender != req.deployer) revert InvalidCaller();
        if (
            req.requestStatus != Status.CREATED ||
            req.requestStatus != Status.APPROVED
        ) revert InvalidRequestStatus();
        req.requestStatus = Status.CANCELED;
        emit RequestStatusChanged(id, req.requestStatus);
    }

    function getRequests() external view returns (Request[] memory reqs) {
        reqs = requests;
    }

    function getPools() external view returns (address[] memory pools) {
        pools = stakingPools;
    }
}
