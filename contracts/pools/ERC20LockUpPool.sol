/*
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20StakingPool is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    error InsufficientAmount(uint256 amount);
    error InsufficientAmountForClaim(uint256 amount);
    error TokensInLockup(uint256 currentTime, uint256 unlockTime);
    error PoolNotStarted();
    error InvalidStartOrLockUpTime();
    error PoolNotActive();
    error NotAdmin();
    // error PoolLockUpPeriod();

    modifier onlyAdmin() {
        if (msg.sender == pool.adminAddress) revert NotAdmin();
        _;
    }
    modifier validPool() {
        if (block.timestamp < pool.poolStartTime) revert PoolNotStarted();
        if (!pool.isActive) revert PoolNotActive();
        _;
    }
    // modifier lockUpPeriod() {
    //     if (block.timestamp < pool.lockupPeriod) revert PoolLockUpPeriod();
    //     _;
    // }

    struct User {
        uint256 amount;
        uint256 claimed;
        uint256 rewardDebt;
        uint256 pending;
    }

    struct Pool {
        IERC20 stakeToken;
        IERC20 rewardToken;
        uint256 poolStartTime;
        uint256 poolEndTime;
        uint256 lockupPeriod;
        uint256 rewardTokenPerBlock;
        uint256 totalStaked;
        uint256 totalClaimed;
        uint256 lastAccessedBlock;
        uint256 accumulatedRewardTokenPerShare;
        bool isActive;
        address adminAddress;
        mapping(address => User) userInfo;
    }
    Pool public pool;
    
    //Events
    event Stake(address user, uint256 amount);
    event Unstake(address user, uint256 amount);
    event Claim(address user, uint256 amount);
    event ActivatePool();
    event UpdatePool(
        uint256 totalStaked,
        uint256 accumulatedRewardTokenPerShare,
        uint256 lastBlockNumber
    );

    constructor(
        address _stakeToken,
        address _rewardToken,
        uint256 _rewardTokenPerBlock,
        uint256 _poolStartTime,
        uint256 _poolEndTime,
        uint256 _lockupPeriod,
        address _adminAddress
    ) Ownable(msg.sender) {
        if (_poolStartTime > _poolEndTime || _lockupPeriod > _poolEndTime)
            revert InvalidStartOrLockUpTime();
        pool.stakeToken = IERC20(_stakeToken);
        pool.rewardToken = IERC20(_rewardToken);
        pool.rewardTokenPerBlock = _rewardTokenPerBlock;
        pool.lastAccessedBlock = _poolStartTime;
        pool.poolStartTime = _poolStartTime;
        pool.poolEndTime = _poolEndTime;
        pool.lockupPeriod = _lockupPeriod;
        pool.adminAddress = _adminAddress;
    }

    function stake(uint256 _amount) external validPool {
        if (_amount == 0) revert InsufficientAmount(_amount);
        _updatePool();
        User storage user = pool.userInfo[msg.sender];
        user.pending +=
            (user.amount * pool.accumulatedRewardTokenPerShare) -
            user.rewardDebt;
        user.rewardDebt = user.amount * pool.accumulatedRewardTokenPerShare;
        unchecked {
            user.amount += _amount;
        }
        pool.totalStaked += _amount;
        pool.stakeToken.safeTransferFrom(msg.sender, address(this), _amount);
        emit Stake(msg.sender, _amount);
    }

    function unstake(uint256 _amount) external nonReentrant {
        _updatePool();
        User storage user = pool.userInfo[msg.sender];
        if (block.timestamp < pool.lockupPeriod)
            revert TokensInLockup(block.timestamp, pool.lockupPeriod);
        if (user.amount < _amount) revert InsufficientAmount(user.amount);
        user.pending +=
            (user.amount * pool.accumulatedRewardTokenPerShare) -
            user.rewardDebt;
        unchecked {
            user.amount -= _amount;
        }
        user.rewardDebt = user.amount * pool.accumulatedRewardTokenPerShare;
        pool.totalStaked -= _amount;
        pool.stakeToken.safeTransfer(msg.sender, _amount);
        emit Unstake(msg.sender, _amount);
    }

    function claim() external nonReentrant {
        _updatePool();
        User storage user = pool.userInfo[msg.sender];
        uint256 amount = user.amount;
        uint256 pending = user.pending;
        if (amount > 0) {
            pending +=
                (amount * pool.accumulatedRewardTokenPerShare) -
                user.rewardDebt;
        }
        user.rewardDebt = amount * pool.accumulatedRewardTokenPerShare;
        if (pending > 0) {
            user.pending = 0;
            unchecked {
                user.claimed += pending;
            }
            pool.totalClaimed += pending;
            pool.rewardToken.safeTransfer(msg.sender, pending);
            emit Claim(msg.sender, user.pending);
        }
    }

    function activate() external onlyAdmin {
        pool.isActive = true;
        emit ActivatePool();
    }

    function pendingRewards(
        address _userAddress
    ) public view returns (uint256) {
        User storage user = pool.userInfo[_userAddress];
        uint256 share = pool.accumulatedRewardTokenPerShare;
        if (block.timestamp > pool.lastAccessedBlock && pool.totalStaked > 0) {
            uint256 blockDifference = _getMultiplier(
                block.timestamp,
                pool.lastAccessedBlock
            );
            uint256 adjustedTokenPerShare = share +
                (pool.rewardTokenPerBlock * blockDifference) /
                pool.totalStaked;
            return (user.amount * adjustedTokenPerShare) / user.rewardDebt;
        } else {
            return (user.amount * share) - user.rewardDebt;
        }
    }

    function _updatePool() internal {
        if (block.timestamp > pool.lastAccessedBlock) {
            if (pool.totalStaked > 0) {
                uint256 blockDifference = _getMultiplier(
                    block.timestamp,
                    pool.lastAccessedBlock
                );
                pool.accumulatedRewardTokenPerShare +=
                    (pool.rewardTokenPerBlock * blockDifference) /
                    pool.totalStaked;
            }
            pool.lastAccessedBlock = block.timestamp;
            emit UpdatePool(
                pool.totalStaked,
                pool.accumulatedRewardTokenPerShare,
                block.timestamp
            );
        }
    }

    /**
     * @notice Return reward multiplier over the given `_from` to `_to` block.
     * If the `from` block is higher than the pool's reward-end block,
     * the function returns 0 and therefore rewards are no longer updated.
     * @param _from timestamp to start
     * @param _to timestamp to finish
     */
    function _getMultiplier(
        uint256 _from,
        uint256 _to
    ) internal view returns (uint256) {
        if (_to <= pool.poolEndTime) {
            return _to - _from;
        } else if (_from >= pool.poolEndTime) {
            return 0;
        } else {
            return pool.poolEndTime - _from;
        }
    }
}
