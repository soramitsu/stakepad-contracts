// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;
import {IERC20BasePool} from "./IERC20BasePool.sol";

interface IERC20PenaltyPoolExtension is IERC20BasePool {
    struct PenaltyPool {
        BasePoolInfo baseInfo;
        uint256 penaltyPeriod;
        uint256 totalPenalties;
    }

    struct PenaltyUser {
        BaseUserInfo baseInfo;
        uint256 penaltyEndTime;
        bool penalized;
    }

    /**
     *  ERROR MESSAGES
     */
    /// @dev Error to indicate that tokens are still in lockup and cannot be accessed
    /// @param currentTime The current timestamp
    /// @param unlockTime The timestamp when the tokens will be unlocked
    error TokensInLockup(uint256 currentTime, uint256 unlockTime);
    /// @dev Error to indicate an invalid penalty duration for unstaking
    error InvalidPenaltyPeriod();

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
