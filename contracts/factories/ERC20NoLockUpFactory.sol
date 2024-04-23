/*
ERC20LockUpFactory
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {ERC20NoLockUpStakingPool} from "../pools/ERC20NoLockUpStakingPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20NoLockUpStakingFactory is Ownable {
    using SafeERC20 for IERC20;
    address[] public stakingPools;
    event CreateStakingPool(address indexed stakingAddress, address indexed stakeToken, address indexed rewardToken, uint256 rewardPerSecond, uint256 startTime, uint256 endTime, address owner);

    constructor() Ownable(msg.sender) {}

    function deploy(
        address _stakeToken,
        address _rewardToken,
        uint256 _rewardPerSecond,
        uint256 _poolStartTime,
        uint256 _poolEndTime
    ) public returns (address newPoolAddress) {
        newPoolAddress = address(
            new ERC20NoLockUpStakingPool{
                salt: keccak256(
                    abi.encodePacked(
                        _stakeToken,
                        _rewardToken,
                        _rewardPerSecond,
                        _poolStartTime,
                        _poolEndTime
                    )
                )
            }(
                _stakeToken,
                _rewardToken,
                _rewardPerSecond,
                _poolStartTime,
                _poolEndTime,
                owner()
            )
        );
        stakingPools.push(newPoolAddress);
        ERC20NoLockUpStakingFactory(newPoolAddress).transferOwnership(msg.sender);
        emit CreateStakingPool(newPoolAddress, _stakeToken, _rewardToken, _rewardPerSecond, _poolStartTime, _poolEndTime, msg.sender);
    }
}
