/*SPDX-License-Identifier: MIT
*/
import "./erc20staking.sol";

contract StakingPoolFactory{
    address[] stakingPools;


    event CreateStakingPool(address stakingPoolAddress, address safeTokenAddress, address rewardTokenAddress);

    function createStakingPool(string memory name, address stakeToken, address rewardToken, uint256 rewardTokenPerBlock) public returns(address){
        StakingPoolErc20 stakingPool = new StakingPoolErc20(rewardTokenPerBlock, stakeToken, rewardToken, name );
        stakingPools.push(address(stakingPool));
        emit CreateStakingPool(address(stakingPool), stakeToken, rewardToken);
    }

    function getDeployedStakingContracts() public view returns (address[] memory) {
        return stakingPools;
    }

    function getDeployedContractsCount() public view returns (uint) {
        return stakingPools.length;
    }
}