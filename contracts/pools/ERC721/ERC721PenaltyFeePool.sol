// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721PenaltyFeePool} from "../../interfaces/IERC721/IERC721PenaltyFeePool.sol";

contract draftERC721PenaltyFeepPool is
    ReentrancyGuard,
    Ownable,
    IERC721PenaltyFeePool
{
    using SafeERC20 for IERC20;
    /// @dev Precision factor for calculations
    uint256 public constant PRECISION_FACTOR = 10e18;
    uint256 public constant PENALTY_FEE = 2500;
    uint256 public constant COLLECTABLE_FEE = 100;

    /// @dev Modifier to ensure that functions can only be executed when the pool is active and within the specified time range
    modifier validPool() {
        if (block.timestamp < pool.startTime) revert PoolNotStarted();
        if (block.timestamp > pool.endTime) revert PoolHasEnded();
        _;
    }
    ///@dev Mapping to store user-specific staking information
    mapping(address => UserInfo) public userInfo;
    ///@dev stakedTokens: Mapping tokenIds to owner addresses
    mapping(uint256 => address) stakedTokens;

    PenaltyPool public pool;

    constructor(
        address stakeToken,
        address rewardToken,
        uint256 rewardTokenPerSecond,
        uint256 poolStartTime,
        uint256 poolEndTime,
        uint256 penaltyPeriod,
        address adminAddress
    ) Ownable(msg.sender) {
        // Ensure the staking period is valid
        if (poolStartTime > poolEndTime) revert InvalidStakingPeriod();
        // Ensure the start time is in the future
        if (poolStartTime < block.timestamp) revert InvalidStartTime();
        // Ensure the LockUp periods are valid
        if (poolEndTime - poolStartTime > penaltyPeriod)
            revert InvalidPenaltyPeriod();

        pool.stakeToken = stakeToken;
        pool.rewardToken = rewardToken;
        pool.startTime = poolStartTime;
        pool.endTime = poolEndTime;
        pool.penaltyPeriod = penaltyPeriod;
        pool.rewardTokenPerSecond = rewardTokenPerSecond;
        pool.lastUpdateTimestamp = poolStartTime;
        pool.adminWallet = adminAddress;
    }

    /**
     * @dev See {IERC721BasePool-stake}.
     */
    function stake(
        uint256[] calldata tokenIds
    ) external validPool nonReentrant {
        uint256 amount = tokenIds.length;
        if (amount == 0) revert InvalidAmount();

        UserInfo storage user = userInfo[msg.sender];
        _updatePool();
        uint256 share = pool.accRewardPerShare;
        uint256 currentAmount = user.amount;
        // Calculate pending rewards
        if (currentAmount > 0) {
            user.pending +=
                (currentAmount * share) /
                PRECISION_FACTOR -
                user.rewardDebt;
        }
        // Update user data
        unchecked {
            user.amount += amount;
        }
        user.rewardDebt = (user.amount * share) / PRECISION_FACTOR;
        pool.totalStaked += amount;

        // Update the staked tokens mapping and ensure the state changes are done first
        for (uint256 i = 0; i < amount; i++) {
            stakedTokens[tokenIds[i]] = msg.sender;
        }

        // Interactions: Transfer the tokens after state changes
        for (uint256 i = 0; i < amount; i++) {
            IERC721(pool.stakeToken).safeTransferFrom(
                msg.sender,
                address(this),
                tokenIds[i]
            );
        }
        emit Stake(msg.sender, tokenIds);
    }

    /**
     * @dev See {IERC721BasePool-unstake}.
     */
    function unstake(uint256[] calldata tokenIds) external nonReentrant {
        uint256 length = tokenIds.length;
        if (length == 0) revert InvalidAmount();
        UserInfo storage user = userInfo[msg.sender];
        uint256 currentAmount = user.amount;
        if (length > currentAmount)
            revert InsufficientAmount(length, currentAmount);
        _updatePool();
        uint256 share = pool.accRewardPerShare;
        user.pending +=
            ((currentAmount * share) / PRECISION_FACTOR) -
            user.rewardDebt;
        // Update user data
        unchecked {
            user.amount -= length;
        }
        user.rewardDebt = (user.amount * share) / PRECISION_FACTOR;
        pool.totalStaked -= length;

        // Update the staked tokens mapping and ensure the state changes are done first
        for (uint256 i = 0; i < length; i++) {
            if (stakedTokens[tokenIds[i]] != msg.sender)
                revert NotStaker();
            delete stakedTokens[tokenIds[i]];
        }

        // Interactions: Transfer the tokens after state changes
        for (uint256 i = 0; i < length; i++) {
            IERC721(pool.stakeToken).safeTransferFrom(
                address(this),
                msg.sender,
                tokenIds[i]
            );
        }
        emit Unstake(msg.sender, tokenIds);
    }

    /**
     * @dev See {IERC721BasePool-claim}.
     */
    function claim() external nonReentrant {
        // Get user information
        UserInfo storage user = userInfo[msg.sender];
        // Check if the current timestamp is before the claim LockUp time
        if (block.timestamp < user.penaltyEndTime)
            revert ClaimInLockUp(block.timestamp, user.penaltyEndTime);
        // Update the pool
        _updatePool();
        uint256 amount = user.amount;
        uint256 pending = user.pending;
        // Calculate pending rewards
        if (amount > 0) {
            pending +=
                (amount * pool.accRewardPerShare) /
                PRECISION_FACTOR -
                user.rewardDebt;
            user.rewardDebt =
                (user.amount * pool.accRewardPerShare) /
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
            IERC20(pool.rewardToken).safeTransfer(msg.sender, pending);
            emit Claim(msg.sender, pending);
        } else {
            revert NothingToClaim();
        }
    }

    function pendingRewards(
        address userAddress
    ) external view returns (uint256) {
        // Get user information
        UserInfo storage user = userInfo[userAddress];
        uint256 share = pool.accRewardPerShare;
        uint256 pending = user.pending;
        // Update accumulated rewards per share if necessary
        if (
            block.timestamp > pool.lastUpdateTimestamp && pool.totalStaked != 0
        ) {
            uint256 elapsedPeriod = _getMultiplier(
                pool.lastUpdateTimestamp,
                block.timestamp
            );
            uint256 totalNewReward = pool.rewardTokenPerSecond * elapsedPeriod;
            share += (totalNewReward * PRECISION_FACTOR) / pool.totalStaked;
        }
        // Calculate pending rewards
        pending += ((user.amount * share) / PRECISION_FACTOR) - user.rewardDebt;
        return pending - _calculatePenalizedAmount(user.penalized, pending);
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

    function _updatePool() internal {
        uint256 lastTimestamp = pool.lastUpdateTimestamp;
        uint256 total = pool.totalStaked;
        // Update accumulated rewards per share if necessary
        if (block.timestamp > lastTimestamp) {
            if (total > 0) {
                uint256 elapsedPeriod = _getMultiplier(
                    lastTimestamp,
                    block.timestamp
                );
                pool.accRewardPerShare +=
                    (pool.rewardTokenPerSecond *
                        PRECISION_FACTOR *
                        elapsedPeriod) /
                    total;
            }
            pool.lastUpdateTimestamp = block.timestamp;
            emit UpdatePool(total, pool.accRewardPerShare, block.timestamp);
        }
    }

    function _getMultiplier(
        uint256 _from,
        uint256 _to
    ) internal view returns (uint256) {
        if (_from > pool.endTime) {
            return 0;
        }
        if (_to <= pool.endTime) {
            return _to - _from;
        } else {
            return pool.endTime - _from;
        }
    }
}
