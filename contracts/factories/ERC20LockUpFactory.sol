/*
ERC20LockUpFactory
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {ERC20LockUpPool} from "../pools/ERC20/ERC20LockUpStakingPool.sol";
import {ILockUpFactory} from "../interfaces/IFactories/ILockUpFactory.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {GenericFactory} from "./GenericFactory.sol";

/// @title ERC20LockUpStakingFactory
/// @notice A smart contract for deploying ERC20 LockUp staking pools.
contract ERC20LockUpStakingFactory is GenericFactory, ILockUpFactory {
    using SafeERC20 for IERC20;

    constructor(address managerContract) GenericFactory(managerContract) {}

    /// @notice Function used to deploy the LockUp staking pool with specified parameters
    /// @dev See {IGenericFactory-deploy}.
    /// @param deployer Address of the deployer
    /// @param payload Encoded LockUp staking pool deployment parameters 
    function deploy(
        address deployer,
        bytes calldata payload
    ) external returns (address newPoolAddress) {
        if (msg.sender != requestManager) revert InvalidCaller();
        if (payload.length != 224) revert InvalidPayloadLength();
        DeploymentData memory data = abi.decode(payload, (DeploymentData));
        newPoolAddress = address(
            new ERC20LockUpPool{
                salt: keccak256(
                    abi.encode(
                        data.stakeToken,
                        data.rewardToken,
                        data.rewardPerSecond,
                        data.poolStartTime,
                        data.poolEndTime
                    )
                )
            }(
                data.stakeToken,
                data.rewardToken,
                data.poolStartTime,
                data.poolEndTime,
                data.rewardPerSecond,
                data.unstakeLockUpTime,
                data.claimLockUpTime
            )
        );
        stakingPools.push(newPoolAddress);
        uint256 rewardAmount = (data.poolEndTime - data.poolStartTime) *
            data.rewardPerSecond;
        ERC20LockUpPool(newPoolAddress).transferOwnership(deployer);
        // Transfer reward tokens from the owner to the contract
        // slither-disable-next-line arbitrary-send-erc20
        IERC20(data.rewardToken).safeTransferFrom(
            deployer,
            newPoolAddress,
            rewardAmount
        );
        emit StakingPoolDeployed(newPoolAddress);
    }
}
