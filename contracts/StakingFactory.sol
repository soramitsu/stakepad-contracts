/*
FTStakingModule
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.24;
import { ERC20StakingPool } from "./ERC20StakingPool.sol";

contract StakingFactory {
    address[] public stakingPools;
    event CreateStakingPool(address indexed stakingAddress);

    function deploy(address _sToken, address _rToken,
     uint256 _rewardPerBlock, uint256 _lockUpPeriod) 
     public returns (address newPoolAddress){
        newPoolAddress = address(
            new ERC20StakingPool{
                salt: keccak256(abi.encodePacked(_sToken, _rToken,
                 _rewardPerBlock, _lockUpPeriod))
            }(_sToken, _rToken, _rewardPerBlock, _lockUpPeriod)
        );
        stakingPools.push(newPoolAddress);
        ERC20StakingPool(newPoolAddress).transferOwnership(msg.sender);
    }
}