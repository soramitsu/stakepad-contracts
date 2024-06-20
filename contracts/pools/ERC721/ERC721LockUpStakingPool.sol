// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IPoolERC721} from "../../interfaces/IPools/IERC721Pool.sol";
import {IPoolErrors} from "../../interfaces/IPools/IPoolErrors.sol";
import {ILockUpPoolStorage} from "../../interfaces/IPools/ILockUpPool.sol";

contract ERC721LockUpPool is
    ReentrancyGuard,
    Ownable,
    IPoolERC721,
    ILockUpPoolStorage,
    IPoolErrors
{
    using SafeERC20 for IERC20;
    /// @dev Precision factor for calculations
    uint256 public constant PRECISION_FACTOR = 10e18;

    /// @dev Modifier to ensure that functions can only be executed when the pool is active and within the specified time range
    modifier validPool() {
        if (block.timestamp < pool.startTime) revert PoolNotStarted();
        if (block.timestamp > pool.endTime) revert PoolHasEnded();
        _;
    }
    ///@dev Mapping to store user-specific staking information
    mapping(address => UserInfo) public userInfo;
    ///@dev stakedTokens: Mapping tokenIds to owner addresses
    mapping(uint256 => address) ownerById;

    LockUpPool public pool;

    constructor(
        address stakeToken,
        address rewardToken,
        uint256 rewardTokenPerSecond,
        uint256 poolStartTime,
        uint256 poolEndTime,
        uint256 unstakeLockUpTime,
        uint256 claimLockUpTime
    ) Ownable(msg.sender) {
        // Ensure the staking period is valid
        if (poolStartTime > poolEndTime) revert InvalidStakingPeriod();
        // Ensure the start time is in the future
        if (poolStartTime < block.timestamp) revert InvalidStartTime();
        // Ensure the LockUp periods are valid
        if (unstakeLockUpTime > poolEndTime || claimLockUpTime > poolEndTime)
            revert InvalidLockUpTime();

        pool.stakeToken = stakeToken;
        pool.rewardToken = rewardToken;
        pool.startTime = poolStartTime;
        pool.endTime = poolEndTime;
        pool.unstakeLockUpTime = unstakeLockUpTime;
        pool.claimLockUpTime = claimLockUpTime;
        pool.rewardTokenPerSecond = rewardTokenPerSecond;
        pool.lastUpdateTimestamp = pool.startTime;
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
            ownerById[tokenIds[i]] = msg.sender;
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
            if (ownerById[tokenIds[i]] != msg.sender) revert NotStaker();
            delete ownerById[tokenIds[i]];
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
        // Check if the current timestamp is before the claim LockUp time
        if (block.timestamp < pool.claimLockUpTime)
            revert TokensInLockUp(block.timestamp, pool.claimLockUpTime);

        // Update the pool
        _updatePool();

        // Get user information
        UserInfo storage user = userInfo[msg.sender];
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
            // Transfer pending rewards to the user
            user.pending = 0;
            unchecked {
                user.claimed += pending;
            }
            pool.totalClaimed += pending;
            IERC20(pool.rewardToken).safeTransfer(msg.sender, pending);
            emit Claim(msg.sender, pending, 0);
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
        return
            user.pending +
            ((user.amount * share) / PRECISION_FACTOR) -
            user.rewardDebt;
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
