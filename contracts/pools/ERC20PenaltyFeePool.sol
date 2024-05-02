/*
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20PenaltyFeePool is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    uint256 public constant PRECISION_FACTOR = 10e18;
    uint256 public constant PENALTY_FEE = 2500;
    uint256 public constant COLLECTABLE_FEE = 100;

    error InvalidStakingPeriod();
    error InvalidStartTime();
    error InvalidPenaltyPeriod();
    error InvalidAmount();
    error TokensInLockup(uint256 currentTime, uint256 unlockTime);
    error InsufficientAmount(uint256 amount);
    error PoolNotStarted();
    error PoolNotActive();
    error PoolIsActive();
    error NotAdmin();

    modifier onlyAdmin() {
        if (msg.sender != pool.adminWallet) revert NotAdmin();
        _;
    }
    modifier validPool() {
        if (block.timestamp < pool.startTime) revert PoolNotStarted();
        if (!pool.isActive) revert PoolNotActive();
        _;
    }

    struct User {
        uint256 amount;
        uint256 claimed;
        uint256 rewardDebt;
        uint256 pending;
        uint256 penaltyEndTime;
        bool penalized;
    }

    struct Pool {
        IERC20 stakeToken;
        IERC20 rewardToken;
        uint256 startTime;
        uint256 endTime;
        uint256 penaltyPeriod;
        uint256 rewardTokenPerSecond;
        uint256 totalStaked;
        uint256 totalClaimed;
        uint256 totalPenalties;
        uint256 lastRewardTimestamp;
        uint256 accRewardPerShare;
        bool isActive;
        address adminWallet;
        mapping(address => User) userInfo;
    }
    Pool public pool;

    //Events
    event Stake(address user, uint256 amount);
    event Unstake(address user, uint256 amount);
    event Claim(address user, uint256 amount);
    event ActivatePool(uint256 rewardAmount);
    event UpdatePool(
        uint256 totalStaked,
        uint256 accumulatedRewardTokenPerShare,
        uint256 lastBlockNumber
    );

    constructor(
        address _stakeToken,
        address _rewardToken,
        uint256 _rewardTokenPerSecond,
        uint256 _poolStartTime,
        uint256 _poolEndTime,
        uint256 _penaltyPeriod,
        address _adminAddress
    ) Ownable(msg.sender) {
        if (_poolStartTime > _poolEndTime) revert InvalidStakingPeriod();
        if (_poolEndTime - _poolStartTime > _penaltyPeriod)
            revert InvalidPenaltyPeriod();
        if (_poolStartTime < block.timestamp) revert InvalidStartTime();
        pool.stakeToken = IERC20(_stakeToken);
        pool.rewardToken = IERC20(_rewardToken);
        pool.rewardTokenPerSecond = _rewardTokenPerSecond;
        pool.lastRewardTimestamp = _poolStartTime;
        pool.startTime = _poolStartTime;
        pool.endTime = _poolEndTime;
        pool.penaltyPeriod = _penaltyPeriod;
        pool.adminWallet = _adminAddress;
    }

    function stake(uint256 _amount) external validPool {
        if (_amount == 0) revert InvalidAmount();
        _updatePool();
        User storage user = pool.userInfo[msg.sender];
        uint256 share = pool.accRewardPerShare;
        uint256 amount = user.amount;
        if (amount > 0) {
            user.pending +=
                (amount * share) /
                PRECISION_FACTOR -
                user.rewardDebt;
        }
        unchecked {
            user.amount = amount + _amount;
        }
        user.penaltyEndTime = block.timestamp + pool.penaltyPeriod >
            pool.endTime
            ? pool.endTime
            : block.timestamp + pool.penaltyPeriod;
        user.rewardDebt = (user.amount * share) / PRECISION_FACTOR;
        pool.totalStaked += _amount;
        pool.stakeToken.safeTransferFrom(msg.sender, address(this), _amount);
        emit Stake(msg.sender, _amount);
    }

    function unstake(uint256 _amount) external nonReentrant {
        if (_amount == 0) revert InvalidAmount();
        User storage user = pool.userInfo[msg.sender];
        uint256 amount = user.amount;
        if (amount < _amount) revert InsufficientAmount(amount);
        _updatePool();
        uint256 share = pool.accRewardPerShare;
        if (block.timestamp <= user.penaltyEndTime) user.penalized = true;
        user.pending += ((amount * share) / PRECISION_FACTOR) - user.rewardDebt;
        unchecked {
            user.amount -= _amount;
        }
        user.rewardDebt = (user.amount * share) / PRECISION_FACTOR;
        pool.totalStaked -= _amount;
        pool.stakeToken.safeTransfer(msg.sender, _amount);
        emit Unstake(msg.sender, _amount);
    }

    function claim() external nonReentrant {
        User storage user = pool.userInfo[msg.sender];
        if (block.timestamp < user.penaltyEndTime)
            revert TokensInLockup(block.timestamp, user.penaltyEndTime);
        _updatePool();
        uint256 amount = user.amount;
        uint256 pending = user.pending;
        if (amount > 0) {
            pending +=
                (amount * pool.accRewardPerShare) /
                PRECISION_FACTOR -
                user.rewardDebt;
            user.rewardDebt =
                (amount * pool.accRewardPerShare) /
                PRECISION_FACTOR;
        }
        if (pending > 0) {
            user.pending = 0;
            uint256 penalityAmount = _calculatePenalizedAmount(
                user.penalized,
                pending
            );
            pending -= penalityAmount;
            if (user.penalized) user.penalized = false;
            unchecked {
                user.claimed += pending;
            }
            pool.totalClaimed += pending;
            pool.totalPenalties += penalityAmount;
            pool.rewardToken.safeTransfer(msg.sender, pending);
            emit Claim(msg.sender, pending);
        }
    }

    function activate() external onlyAdmin {
        if (pool.isActive) revert PoolIsActive();
        uint256 rewardAmount = (pool.endTime - pool.startTime) *
            pool.rewardTokenPerSecond;
        pool.rewardToken.safeTransferFrom(owner(), address(this), rewardAmount);
        pool.isActive = true;
        emit ActivatePool(rewardAmount);
    }

    function pendingRewards(
        address _userAddress
    ) public view returns (uint256) {
        User storage user = pool.userInfo[_userAddress];
        uint256 share = pool.accRewardPerShare;
        uint256 pending = user.pending;
        if (
            block.timestamp > pool.lastRewardTimestamp && pool.totalStaked > 0
        ) {
            uint256 elapsedPeriod = _getMultiplier(
                block.timestamp,
                pool.lastRewardTimestamp
            );
            uint256 totalNewReward = pool.rewardTokenPerSecond * elapsedPeriod;
            share =
                share +
                ((totalNewReward * PRECISION_FACTOR) / pool.totalStaked);
        }
        pending += ((user.amount * share) / PRECISION_FACTOR) - user.rewardDebt;
        return pending - _calculatePenalizedAmount(user.penalized, pending);
    }

    function getUserInfo(
        address _user
    ) external view returns (User memory userInfo) {
        userInfo = pool.userInfo[_user];
    }

    function _updatePool() internal {
        if (block.timestamp > pool.lastRewardTimestamp) {
            if (pool.totalStaked != 0) {
                uint256 elapsedPeriod = _getMultiplier(
                    block.timestamp,
                    pool.lastRewardTimestamp
                );
                pool.accRewardPerShare +=
                    (pool.rewardTokenPerSecond *
                        PRECISION_FACTOR *
                        elapsedPeriod) /
                    pool.totalStaked;
            }
            pool.lastRewardTimestamp = block.timestamp;
            emit UpdatePool(
                pool.totalStaked,
                pool.accRewardPerShare,
                block.timestamp
            );
        }
    }

    function _calculatePenalizedAmount(
        bool penalized,
        uint256 _amountToPenalize
    ) internal pure returns (uint256) {
        if (penalized) {
            return (_amountToPenalize * PENALTY_FEE) / 10000;
        }
        // Flat 1% penalty fee in basis points if the penalty period has already ended
        return (_amountToPenalize * COLLECTABLE_FEE) / 10000;
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
        if (_to <= pool.endTime) {
            return _to - _from;
        } else if (_from >= pool.endTime) {
            return 0;
        } else {
            return pool.endTime - _from;
        }
    }
}
