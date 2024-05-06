/*
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20PenaltyPoolExtension} from "../interfaces/IERC20PenaltyPoolExtension.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20PenaltyFeePool is
    ReentrancyGuard,
    Ownable,
    IERC20PenaltyPoolExtension
{
    using SafeERC20 for IERC20;
    uint256 public constant PRECISION_FACTOR = 10e18;
    uint256 public constant PENALTY_FEE = 2500;
    uint256 public constant COLLECTABLE_FEE = 100;

    ///@dev Public pool variable to access pool data
    PenaltyPool public pool;
    ///@dev Mapping to store user-specific staking information
    mapping(address => PenaltyUser) public userInfo;

    modifier onlyAdmin() {
        if (msg.sender != pool.baseInfo.adminWallet) revert NotAdmin();
        _;
    }
    modifier validPool() {
        if (block.timestamp < pool.baseInfo.startTime) revert PoolNotStarted();
        if (!pool.baseInfo.isActive) revert PoolNotActive();
        _;
    }

    constructor(
        address stakeToken,
        address rewardToken,
        uint256 rewardTokenPerSecond,
        uint256 poolStartTime,
        uint256 poolEndTime,
        uint256 penaltyPeriod,
        address adminAddress
    ) Ownable(msg.sender) {
        if (poolStartTime > poolEndTime) revert InvalidStakingPeriod();
        if (poolStartTime < block.timestamp) revert InvalidStartTime();
        if (poolEndTime - poolStartTime > penaltyPeriod)
            revert InvalidPenaltyPeriod();
        pool.baseInfo.stakeToken = stakeToken;
        pool.baseInfo.rewardToken = rewardToken;
        pool.baseInfo.rewardTokenPerSecond = rewardTokenPerSecond;
        pool.baseInfo.lastRewardTimestamp = poolStartTime;
        pool.baseInfo.startTime = poolStartTime;
        pool.baseInfo.endTime = poolEndTime;
        pool.baseInfo.adminWallet = adminAddress;
        pool.penaltyPeriod = penaltyPeriod;
        
    }

    /**
     * @dev See {IERC20BasePool-stake}.
     */
    function stake(uint256 amount) external validPool {
        if (amount == 0) revert InvalidAmount();
        _updatePool();
        PenaltyUser storage user = userInfo[msg.sender];
        uint256 share = pool.baseInfo.accRewardPerShare;
        uint256 currentAmount = user.baseInfo.amount;
        if (currentAmount > 0) {
            user.baseInfo.pending +=
                (currentAmount * share) /
                PRECISION_FACTOR -
                user.baseInfo.rewardDebt;
        }
        unchecked {
            user.baseInfo.amount = currentAmount + amount;
        }
        user.penaltyEndTime = block.timestamp + pool.penaltyPeriod >
            pool.baseInfo.endTime
            ? pool.baseInfo.endTime
            : block.timestamp + pool.penaltyPeriod;
        user.baseInfo.rewardDebt = (user.baseInfo.amount * share) / PRECISION_FACTOR;
        pool.baseInfo.totalStaked += amount;
        IERC20(pool.baseInfo.stakeToken).safeTransferFrom(msg.sender, address(this), amount);
        emit Stake(msg.sender, amount);
    }

    /**
     * @dev See {IERC20BasePool-unstake}.
     */
    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        PenaltyUser storage user = userInfo[msg.sender];
        uint256 currentAmount = user.baseInfo.amount;
        if (currentAmount < amount) revert InsufficientAmount(currentAmount, amount);
        _updatePool();
        uint256 share = pool.baseInfo.accRewardPerShare;
        if (block.timestamp <= user.penaltyEndTime) user.penalized = true;
        user.baseInfo.pending += ((currentAmount * share) / PRECISION_FACTOR) - user.baseInfo.rewardDebt;
        unchecked {
            user.baseInfo.amount -= amount;
        }
        user.baseInfo.rewardDebt = (user.baseInfo.amount * share) / PRECISION_FACTOR;
        pool.baseInfo.totalStaked -= amount;
        IERC20(pool.baseInfo.stakeToken).safeTransfer(msg.sender, amount);
        emit Unstake(msg.sender, amount);
    }

    /**
     * @dev See {IERC20BasePool-claim}.
     */
    function claim() external nonReentrant {
        PenaltyUser storage user = userInfo[msg.sender];
        if (block.timestamp < user.penaltyEndTime)
            revert TokensInLockup(block.timestamp, user.penaltyEndTime);
        _updatePool();
        uint256 amount = user.baseInfo.amount;
        uint256 pending = user.baseInfo.pending;
        if (amount > 0) {
            pending +=
                (amount * pool.baseInfo.accRewardPerShare) /
                PRECISION_FACTOR -
                user.baseInfo.rewardDebt;
            user.baseInfo.rewardDebt =
                (amount * pool.baseInfo.accRewardPerShare) /
                PRECISION_FACTOR;
        }
        if (pending == 0) revert NothingToClaim();
        user.baseInfo.pending = 0;
        uint256 penalityAmount = _calculatePenalizedAmount(
            user.penalized,
            pending
        );
        pending -= penalityAmount;
        if (user.penalized) user.penalized = false;
        unchecked {
            user.baseInfo.claimed += pending;
        }
        pool.baseInfo.totalClaimed += pending;
        pool.totalPenalties += penalityAmount;
        IERC20(pool.baseInfo.rewardToken).safeTransfer(msg.sender, pending);
        emit Claim(msg.sender, pending);
    }

    /**
     * @dev See {IERC20BasePool-activate}.
     */
    function activate() external onlyAdmin {
        // Check if the pool is already active
        if (pool.baseInfo.isActive) revert PoolIsActive();
        // Check if the current timestamp is after the end time of the pool
        if (block.timestamp >= pool.baseInfo.endTime) revert PoolHasEnded();
        // Activate the pool
        pool.baseInfo.isActive = true;
        uint256 timestampToFund = pool.baseInfo.startTime;
        if (block.timestamp > timestampToFund){
            timestampToFund = block.timestamp;
            pool.baseInfo.lastRewardTimestamp = timestampToFund;
        }
        // Calculate the reward amount to fund the pool
        uint256 rewardAmount = (pool.baseInfo.endTime - timestampToFund) *
            pool.baseInfo.rewardTokenPerSecond;
        // Transfer reward tokens from the owner to the contract
        // slither-disable-next-line arbitrary-send-erc20
        IERC20(pool.baseInfo.rewardToken).safeTransferFrom(owner(), address(this), rewardAmount);
        // Emit activation event
        emit ActivatePool(rewardAmount);
    }

    /**
     * @dev See {IERC20BasePool-pendingRewards}.
     */
    function pendingRewards(address userAddress) public view returns (uint256) {
        PenaltyUser storage user = userInfo[userAddress];
        uint256 share = pool.baseInfo.accRewardPerShare;
        uint256 pending = user.baseInfo.pending;
        if (
            block.timestamp > pool.baseInfo.lastRewardTimestamp && pool.baseInfo.totalStaked > 0
        ) {
            uint256 elapsedPeriod = _getMultiplier(
                block.timestamp,
                pool.baseInfo.lastRewardTimestamp
            );
            uint256 totalNewReward = pool.baseInfo.rewardTokenPerSecond * elapsedPeriod;
            share =
                share +
                ((totalNewReward * PRECISION_FACTOR) / pool.baseInfo.totalStaked);
        }
        pending += ((user.baseInfo.amount * share) / PRECISION_FACTOR) - user.baseInfo.rewardDebt;
        return pending - _calculatePenalizedAmount(user.penalized, pending);
    }

    function _updatePool() internal {
        if (block.timestamp > pool.baseInfo.lastRewardTimestamp) {
            if (pool.baseInfo.totalStaked != 0) {
                uint256 elapsedPeriod = _getMultiplier(
                    block.timestamp,
                    pool.baseInfo.lastRewardTimestamp
                );
                pool.baseInfo.accRewardPerShare +=
                    (pool.baseInfo.rewardTokenPerSecond *
                        PRECISION_FACTOR *
                        elapsedPeriod) /
                    pool.baseInfo.totalStaked;
            }
            pool.baseInfo.lastRewardTimestamp = block.timestamp;
            emit UpdatePool(
                pool.baseInfo.totalStaked,
                pool.baseInfo.accRewardPerShare,
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
        if (_to <= pool.baseInfo.endTime) {
            return _to - _from;
        } else if (_from >= pool.baseInfo.endTime) {
            return 0;
        } else {
            return pool.baseInfo.endTime - _from;
        }
    }
}
