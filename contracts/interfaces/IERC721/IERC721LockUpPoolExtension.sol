// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721BasePool} from "./IERC721BasePool.sol";

interface IERC721LockUpPoolExtension is IERC721BasePool{
    /**
     * @notice Defines the pool state and config parameters
     * @dev stakeToken The address of the ERC721 staking token
     * @dev rewardToken The address of the ERC20 reward token
     * @dev startTime The start time of the pool
     * @dev endTime The end time of the pool
     * @dev unstakeLockupTime The lockup period (in seconds) after unstaking
     * @dev claimLockupTime The lockup period (in seconds) before claiming rewards
     * @dev rewardTokenPerSecond The reward distribution rate per second
     * @dev totalStaked: Total tokens staked
     * @dev totalClaimed: Total rewards claimed
     * @dev lastUpdateTimestamp: The timestamp of the last update
     * @dev accRewardPerShare: Accumulated rewards per staked token
     * @dev isActive: Flag indicating active/inactive pool
     * @dev adminWallet: Address of the pool admin
     * @dev userInfo: Mapping for user staking data
     * @dev stakedTokens: Mapping tokenIds to owner addresses
     */
    struct Pool {
        IERC721 stakeToken;
        IERC20 rewardToken;
        uint256 startTime;
        uint256 endTime;
        uint256 rewardTokenPerSecond;
        uint256 totalStaked;
        uint256 totalClaimed;
        uint256 lastUpdateTimestamp;
        uint256 accRewardPerShare;
        bool isActive;
        address adminWallet;
        mapping(address => BaseUserInfo) userInfo;
        mapping(uint256 => address) stakedTokens;
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
