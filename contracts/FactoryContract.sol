/*SPDX-License-Identifier: MIT
*/
import "./erc20staking.sol";

contract StakingPoolFactory is Ownable{
    address[] stakingPools;


    event CreateStakingPool(stakingPoolAddress, safeTokenAddress, rewardTokenAddress);

    function createStakingPool(string memory name, address safeToken, address rewardToken) public returns(address){
        StakingPoolErc20 stakingPool = new StakingPoolErc20();
        stakingPools.push(address(stakingPool));
        emit(address(stakingPool), safeToken, rewardToken);
    }

    function getDeployedStakingContracts() public view returns (address[] memory) {
        return deployedStakingContracts;
    }
}