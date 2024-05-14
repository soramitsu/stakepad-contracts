// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;
import {IBasePoolERC20} from "./IERC20BasePool.sol";

interface IERC20LockupPool is IBasePoolERC20 {
    struct UserInfo {
        uint256 amount; // Amount of tokens staked
        uint256 claimed; // Amount of claimed rewards
        uint256 rewardDebt; // Reward debt
        uint256 pending; // Pending rewards
    }

    struct LockupPool {
        address stakeToken; // ERC20 token being staked
        address rewardToken; // ERC20 token used for rewards
        uint256 startTime; // Start time of the staking pool
        uint256 endTime; // End time of the staking pool
        uint256 unstakeLockupTime; // Lockup period for unstaking
        uint256 claimLockupTime; // Lockup period for claiming rewards
        uint256 rewardTokenPerSecond; // Rate of rewards per second
        uint256 totalStaked; // Total amount of tokens staked
        uint256 totalClaimed; // Total amount of claimed rewards
        uint256 lastUpdateTimestamp; // Timestamp of the last reward update
        uint256 accRewardPerShare; // Accumulated rewards per share
    }

    /**
     *  ERROR MESSAGES
     */

    /// @dev Error to indicate that tokens are still in Lockup and cannot be accessed
    /// @param currentTime The current timestamp
    /// @param unlockTime The timestamp when the tokens will be unlocked
    error TokensInLockup(uint256 currentTime, uint256 unlockTime);

    /// @dev Error to indicate an invalid Lockup time for unstaking or claiming rewards
    error InvalidLockupTime();
}
