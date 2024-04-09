/*
FTStakingModule
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import { ERC20StakingPool } from "./ERC20StakingPool.sol";

contract StakingFactory {
    address[] public stakingPools;
    address adminWalletAddress;
    event CreateStakingPool(address indexed stakingAddress);
    constructor(address _adminWalletAddress){
        adminWalletAddress = _adminWalletAddress;
    }

    function deploy(address _safeToken, address _rewardToken,
     uint256 _rewardPerBlock, uint256 _poolStartTime, uint256 _poolEndTime) 
     public returns (address newPoolAddress){
        newPoolAddress = address(
            new ERC20StakingPool{
                salt: keccak256(abi.encodePacked(_safeToken, _rewardToken,
                 _rewardPerBlock, _poolStartTime, _poolEndTime))
            }(_safeToken, _rewardToken, _rewardPerBlock, _poolStartTime, _poolEndTime, adminWalletAddress)
        );
        stakingPools.push(newPoolAddress);
        ERC20StakingPool(newPoolAddress).transferOwnership(msg.sender);
    }
}