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
contract ERC721PenaltyFeeStakingFactory is Ownable, IPenaltyFeeFactory {
    using SafeERC20 for IERC20;
    address public requestManager;
    address[] public stakingPools;

    constructor(address managerContract) Ownable(msg.sender) {
        if (managerContract == address(0)) revert InvalidManagerAddress();
        requestManager = managerContract;
    }

    /// @notice Function allows users to deploy the penaltyFee staking pool with specified parameters
     function deploy(address deployer, bytes calldata payload) public returns (address newPoolAddress) {
        if (payload.length != 192) revert InvalidPayloadLength();
        if (msg.sender != requestManager) revert InvalidCaller();
        DeploymentData memory data = abi.decode(payload, (DeploymentData));
        newPoolAddress = address(
            new ERC721PenaltyFeePool{
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
                data.penaltyPeriod,
                owner()
            )
        );
        stakingPools.push(newPoolAddress);
        uint256 rewardAmount = (data.poolEndTime - data.poolStartTime) *
            data.rewardPerSecond;
        ERC721PenaltyFeePool(newPoolAddress).transferOwnership(deployer);
        // Transfer reward tokens from the owner to the contract
        // slither-disable-next-line arbitrary-send-erc20
        IERC20(data.rewardToken).safeTransferFrom(
            deployer,
            newPoolAddress,
            rewardAmount
        );
        
        emit StakingPoolDeployed(newPoolAddress);
    }
    
    function getPools() external view returns (address[] memory pools) {
        pools = stakingPools;
    }
}