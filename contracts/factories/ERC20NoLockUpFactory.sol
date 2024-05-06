/*
ERC20LockUpFactory
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {ERC20NoLockUpStakingPool} from "../pools/ERC20NoLockUpStakingPool.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC20LockUpStakingFactory
/// @notice A smart contract for deploying ERC20 regular staking pools.
/// @author Ayooluwa Akindeko, Soramitsu team
contract ERC20NoLockUpStakingFactory is Ownable {
    address[] public stakingPools;
    event CreateStakingPool(address indexed stakingAddress, address indexed stakeToken, address indexed rewardToken, uint256 rewardPerSecond, uint256 startTime, uint256 endTime, address owner);

    constructor() Ownable(msg.sender) {}

    /// @notice Function allows users to deploy the regular staking pool with specified parameters
    /// @param stakeToken Address of the ERC20 token to be staked
    /// @param rewardToken Address of the ERC20 token used for rewards
    /// @param rewardPerSecond Rate of rewards per second
    /// @param poolStartTime Start time of the staking pool
    /// @param poolEndTime End time of the staking pool
    function deploy(
        address stakeToken,
        address rewardToken,
        uint256 rewardPerSecond,
        uint256 poolStartTime,
        uint256 poolEndTime
    ) public returns (address newPoolAddress) {
        newPoolAddress = address(
            new ERC20NoLockUpStakingPool{
                salt: keccak256(
                    abi.encodePacked(
                        stakeToken,
                        rewardToken,
                        rewardPerSecond,
                        poolStartTime,
                        poolEndTime
                    )
                )
            }(
                stakeToken,
                rewardToken,
                rewardPerSecond,
                poolStartTime,
                poolEndTime,
                owner()
            )
        );
        stakingPools.push(newPoolAddress);
        ERC20NoLockUpStakingFactory(newPoolAddress).transferOwnership(msg.sender);
        emit CreateStakingPool(newPoolAddress, stakeToken, rewardToken, rewardPerSecond, poolStartTime, poolEndTime, msg.sender);
    }

    function getPools() external view returns (address[] memory) {
        return stakingPools;
    }
}
