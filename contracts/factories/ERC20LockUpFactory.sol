/*
ERC20LockUpFactory
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {ERC20LockUpStakingPool} from "../pools/ERC20LockUpStakingPool.sol";
import {IERC20LockUpFactoryExtension} from "../interfaces/IERC20Factories/IERC20LockUpFactoryExtension.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ERC20LockUpStakingFactory
/// @notice A smart contract for deploying ERC20 lockup staking pools.
/// @author Ayooluwa Akindeko, Soramitsu team
contract ERC20LockUpStakingFactory is Ownable, IERC20LockUpFactoryExtension {
    using SafeERC20 for IERC20;

    address[] public stakingPools;
    Request[] public requests;

    constructor() Ownable(msg.sender) {}

    /// @notice Function allows users to deploy the lockup staking pool with specified parameters
    function deploy(uint256 id) public returns (address newPoolAddress) {
        if (requests.length < id) revert InvalidId();
        Request memory req = requests[id];
        if (req.requestStatus != Status.APROVED) revert InvalidRequestStatus();
        if (msg.sender != req.deployer) revert InvalidCaller();
        newPoolAddress = address(
            new ERC20LockUpStakingPool{
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
                req.data.unstakeLockupTime,
                req.data.claimLockupTime,
                owner()
            )
        );
        stakingPools.push(newPoolAddress);
        ERC20LockUpStakingPool(newPoolAddress).transferOwnership(msg.sender);
        uint256 rewardAmount = (req.data.poolEndTime - req.data.poolStartTime) *
            req.data.rewardPerSecond;
        // Transfer reward tokens from the owner to the contract
        // slither-disable-next-line arbitrary-send-erc20
        IERC20(req.data.rewardToken).safeTransferFrom(
            msg.sender,
            newPoolAddress,
            rewardAmount
        );
        requests[id].requestStatus = Status.DEPLOYED;
        emit CreateStakingPool(
            newPoolAddress,
            req.data.stakeToken,
            req.data.rewardToken,
            req.data.rewardPerSecond,
            req.data.poolStartTime,
            req.data.poolEndTime,
            msg.sender
        );
    }

    function requestDeployment(DeploymentData calldata data) external {
        if (data.stakeToken == address(0) || data.rewardToken == address(0))
            revert InvalidTokenAddress();
        requests.push(
            Request(requests.length, msg.sender, Status.CREATED, data)
        );
    }

    function approveRequest(uint256 id) external onlyOwner {
        if (requests.length < id) revert InvalidId();
        Request storage req = requests[id];
        if (req.requestStatus != Status.CREATED) revert InvalidRequestStatus();
        req.requestStatus = Status.APROVED;
        emit RequestStatusChanged(id, req.requestStatus);
    }

    function denyRequest(uint256 id) external onlyOwner {
        if (requests.length < id) revert InvalidId();
        Request storage req = requests[id];
        if (req.requestStatus != Status.CREATED) revert InvalidRequestStatus();
        req.requestStatus = Status.DENIED;
        emit RequestStatusChanged(id, req.requestStatus);
    }

    function cancelRequest(uint256 id) external onlyOwner {
        if (requests.length < id) revert InvalidId();
        Request storage req = requests[id];
        if (req.requestStatus != Status.CREATED) revert InvalidRequestStatus();
        if (msg.sender != req.deployer) revert InvalidCaller();
        req.requestStatus = Status.CANCELED;
        emit RequestStatusChanged(id, req.requestStatus);
    }

    function getRequests() external view returns (Request[] memory reqs) {
        reqs = requests;
    }

    function getPools() external view returns (address[] memory) {
        return stakingPools;
    }
}
