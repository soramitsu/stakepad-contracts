// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;
import {IBasePoolERC20} from "./IERC20BasePool.sol";

interface IERC20PenaltyPool is IBasePoolERC20 {
    struct PenaltyPool {
        address stakeToken; // ERC20 token being staked
        address rewardToken; // ERC20 token used for rewards
        uint256 startTime; // Start time of the staking pool
        uint256 endTime; // End time of the staking pool
        uint256 penaltyPeriod;
        uint256 rewardTokenPerSecond; // Rate of rewards per second
        uint256 totalStaked; // Total amount of tokens staked
        uint256 totalClaimed; // Total amount of claimed rewards
        uint256 totalPenalties;
        uint256 lastRewardTimestamp; // Timestamp of the last reward update
        uint256 accRewardPerShare; // Accumulated rewards per share
        address adminWallet; // Address of the admin
    }

    struct UserInfo {
        uint256 amount; // Amount of tokens staked
        uint256 claimed; // Amount of claimed rewards
        uint256 rewardDebt; // Reward debt
        uint256 pending; // Pending rewards
        uint256 penaltyEndTime;
        bool penalized;
    }

    /**
     *  ERROR MESSAGES
     */
    /// @dev Error to indicate that tokens are still in lockup and cannot be claimed
    /// @param currentTime The current timestamp
    /// @param unlockTime The timestamp when the tokens will be unlocked for claim
    error ClaimInLockup(uint256 currentTime, uint256 unlockTime);
    /// @dev Error to indicate an invalid penalty duration for unstaking
    error InvalidPenaltyPeriod();
    /// @dev Error to indicate that the caller is not the admin
    error NotAdmin();

    /**
     *  EVENTS
     */
    
    /**
     * @notice Event to notify when an admin claims accumulated fees
     * @dev Emmited in 'claim' function
     * @param amount The amount of fees claimed
     */
    event FeeClaim(uint256 amount);
}
