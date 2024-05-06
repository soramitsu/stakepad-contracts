// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;
import {IERC20BasePool} from "./IERC20BasePool.sol";

interface IERC20LockUpPoolExtension is IERC20BasePool {
    struct LockUpPool {
        BasePoolInfo baseInfo;
        uint256 unstakeLockupTime; // Lockup period for unstaking
        uint256 claimLockupTime; // Lockup period for claiming rewards
    }

    /**
     *  ERROR MESSAGES
     */

    /// @dev Error to indicate that tokens are still in lockup and cannot be accessed
    /// @param currentTime The current timestamp
    /// @param unlockTime The timestamp when the tokens will be unlocked
    error TokensInLockup(uint256 currentTime, uint256 unlockTime);

    /// @dev Error to indicate an invalid lockup time for unstaking or claiming rewards
    error InvalidLockupTime();
}
