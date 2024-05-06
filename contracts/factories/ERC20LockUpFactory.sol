/*
ERC20LockUpFactory
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {ERC20LockUpStakingPool} from "../pools/ERC20LockUpStakingPool.sol";
import {IERC20LockUpFactoryExtension} from "../interfaces/IERC20LockUpFactoryExtension.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC20LockUpStakingFactory
/// @notice A smart contract for deploying ERC20 lockup staking pools.
/// @author Ayooluwa Akindeko, Soramitsu team
contract ERC20LockUpStakingFactory is Ownable, IERC20LockUpFactoryExtension {
    address[] public stakingPools;
    Request[] public requests;

    constructor() Ownable(msg.sender) {}

    /// @notice Function allows users to deploy the lockup staking pool with specified parameters
    function deploy(uint256 id) public returns (address newPoolAddress) {
        if (requests.length < id) revert("InvalidId");
        Request storage req = requests[id];
        if (req.requestStatus != Status.APROVED) revert("InvalidRequest");
        newPoolAddress = address(
            new ERC20LockUpStakingPool{
                salt: keccak256(
                    abi.encode(
                        req.data.baseParams
                    )
                )
            }(
                req.data.baseParams.stakeToken,
                req.data.baseParams.rewardToken,
                req.data.baseParams.rewardPerSecond,
                req.data.baseParams.poolStartTime,
                req.data.baseParams.poolEndTime,
                req.data.unstakeLockupTime,
                req.data.claimLockupTime,
                owner()
            )
        );
        stakingPools.push(newPoolAddress);
        ERC20LockUpStakingPool(newPoolAddress).transferOwnership(msg.sender);
        req.requestStatus = Status.DEPLOYED;
        emit CreateStakingPool(newPoolAddress, req.data.baseParams.stakeToken, req.data.baseParams.rewardToken, req.data.baseParams.rewardPerSecond, req.data.baseParams.poolStartTime, req.data.baseParams.poolEndTime, msg.sender);
    }

    function requestDeployment(DeploymentData calldata data) external {
        if (data.baseParams.stakeToken == address(0) || data.baseParams.rewardToken == address(0)) revert("InvalidTokenAddress");
        requests.push(Request(requests.length, msg.sender, Status.CREATED, data));
    }

    function approveRequest(uint256 id) external onlyOwner{
        if (requests.length < id) revert("InvalidId");
        Request storage req = requests[id];
        if (req.requestStatus != Status.CREATED) revert("InvalidRequest");
        req.requestStatus = Status.APROVED;
    }

    function denyRequest(uint256 id) external onlyOwner{
        if (requests.length < id) revert("InvalidId");
        Request storage req = requests[id];
        if (req.requestStatus != Status.CREATED) revert("InvalidRequest");
        req.requestStatus = Status.DENIED;
    }

    function cancelRequest(uint256 id) external onlyOwner{
        if (requests.length < id) revert("InvalidId");
        Request storage req = requests[id];
        if (req.requestStatus != Status.CREATED) revert("InvalidRequest");
        if (msg.sender != req.deployer) revert("InvalidCaller");
        req.requestStatus = Status.DENIED;
    }

    function getRequests() external view returns(Request[] memory reqs){
        reqs = requests;
    }

    function getPools() external view returns (address[] memory) {
        return stakingPools;
    }
}
