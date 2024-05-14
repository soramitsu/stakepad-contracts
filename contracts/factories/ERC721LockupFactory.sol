/*
ERC20LockupFactory
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {ERC721LockupPool} from "../pools/ERC721/ERC721LockupStakingPool.sol";
import {ILockupFactory} from "../interfaces/IFactories/ILockupFactory.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ERC721LockupStakingFactory
/// @notice A smart contract for deploying ERC721 Lockup staking pools.
/// @author Ayooluwa Akindeko, Soramitsu team
contract ERC721LockupStakingFactory is Ownable, ILockupFactory {
    using SafeERC20 for IERC20;

    address[] public stakingPools;
    Request[] public requests;
    mapping(uint256 id => address pool) public poolById;

    constructor() Ownable(msg.sender) {}

    /// @notice Function allows users to deploy the Lockup staking pool with specified parameters
    function deploy(uint256 id) public returns (address newPoolAddress) {
        if (requests.length < id) revert InvalidId();
        Request memory req = requests[id];
        if (req.requestStatus != Status.APPROVED) revert InvalidRequestStatus();
        if (msg.sender != req.deployer) revert InvalidCaller();
        newPoolAddress = address(
            new ERC721LockupPool{
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
                req.data.unstakeLockupTime,
                req.data.claimLockupTime,
                req.data.rewardPerSecond
            )
        );
        stakingPools.push(newPoolAddress);
        requests[id].requestStatus = Status.DEPLOYED;
        poolById[id] = newPoolAddress;
        uint256 rewardAmount = (req.data.poolEndTime - req.data.poolStartTime) *
            req.data.rewardPerSecond;
        ERC721LockupPool(newPoolAddress).transferOwnership(msg.sender);
        // Transfer reward tokens from the owner to the contract
        // slither-disable-next-line arbitrary-send-erc20
        IERC20(req.data.rewardToken).safeTransferFrom(
            msg.sender,
            newPoolAddress,
            rewardAmount
        );
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
            req.requestStatus != Status.CREATED &&
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
