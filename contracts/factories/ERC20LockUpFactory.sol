/*
ERC20LockUpFactory
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {ERC20StakingPool} from "../pools/ERC20LockUpPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract StakingFactory is Ownable {
    using SafeERC20 for IERC20;
    address[] public stakingPools;
    event CreateStakingPool(address indexed stakingAddress);

    constructor() Ownable(msg.sender) {}

    function deploy(
        address _stakeToken,
        address _rewardToken,
        uint256 _rewardPerBlock,
        uint256 _poolStartTime,
        uint256 _poolEndTime,
        uint256 _lockupPeriod
    ) public returns (address newPoolAddress) {
        newPoolAddress = address(
            new ERC20StakingPool{
                salt: keccak256(
                    abi.encodePacked(
                        _stakeToken,
                        _rewardToken,
                        _rewardPerBlock,
                        _poolStartTime,
                        _poolEndTime,
                        _lockupPeriod,
                        owner()
                    )
                )
            }(
                _stakeToken,
                _rewardToken,
                _rewardPerBlock,
                _poolStartTime,
                _poolEndTime,
                _lockupPeriod,
                owner()
            )
        );
        stakingPools.push(newPoolAddress);
        ERC20StakingPool(newPoolAddress).transferOwnership(msg.sender);
        IERC20(_rewardToken).safeTransferFrom(
            msg.sender,
            newPoolAddress,
            (_poolEndTime - _poolStartTime) * _rewardPerBlock
        );
        emit CreateStakingPool(newPoolAddress);
    }
}
