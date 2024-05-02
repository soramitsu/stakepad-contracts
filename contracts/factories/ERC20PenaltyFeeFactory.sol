/*
ERC20LockUpFactory
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {ERC20PenaltyFeePool} from "../pools/ERC20PenaltyFeePool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract StakingFactory is Ownable {
    using SafeERC20 for IERC20;
    address[] public stakingPools;
    event CreateStakingPool(address indexed stakingAddress, address indexed stakeToken, address indexed rewardToken, uint256 rewardPerSecond, uint256 startTime, uint256 endTime, address owner);

    constructor() Ownable(msg.sender) {}

    function deploy(
        address _stakeToken,
        address _rewardToken,
        uint256 _rewardPerSecond,
        uint256 _poolStartTime,
        uint256 _poolEndTime,
        uint256 _penaltyPeriod
    ) public returns (address newPoolAddress) {
        newPoolAddress = address(
            new ERC20PenaltyFeePool{
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
                _penaltyPeriod,
                owner()
            )
        );
        stakingPools.push(newPoolAddress);
        ERC20PenaltyFeePool(newPoolAddress).transferOwnership(msg.sender);
        emit CreateStakingPool(newPoolAddress, _stakeToken, _rewardToken, _rewardPerSecond, _poolStartTime,_poolEndTime, msg.sender);
    }
}
