/*
ERC20LockUpFactory
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {ERC20LockUpStakingPool} from "../pools/ERC20LockUpStakingPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Erc20LockUpStakingFactory is Ownable {
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
        uint256 _unstakeLockup,
        uint256 _claimLockup
    ) public returns (address newPoolAddress) {
        newPoolAddress = address(
            new ERC20LockUpStakingPool{
                salt: keccak256(
                    abi.encodePacked(
                        _stakeToken,
                        _rewardToken,
                        _rewardPerBlock,
                        _poolStartTime,
                        _poolEndTime
                    )
                )
            }(
                _stakeToken,
                _rewardToken,
                _rewardPerBlock,
                _poolStartTime,
                _poolEndTime,
                _unstakeLockup,
                _claimLockup,
                owner()
            )
        );
        stakingPools.push(newPoolAddress);
        ERC20LockUpStakingPool(newPoolAddress).transferOwnership(msg.sender);
        IERC20(_rewardToken).safeTransferFrom(
            msg.sender,
            newPoolAddress,
            (_poolEndTime - _poolStartTime) * _rewardPerBlock
        );
        emit CreateStakingPool(newPoolAddress);
    }
}
