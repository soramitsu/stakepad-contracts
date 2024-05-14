// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721BasePool} from "./IERC721BasePool.sol";

interface IERC721PenaltyFeePool is IERC721BasePool{

    /**
     * @notice Storage for a user's staking information
     * @dev amount Number of tokens staked by the user.
     * @dev claimed The amount of rewards already claimed by the user
     * @dev rewardDebt Used to calculate rewards efficiently
     * @dev pending The amount of rewards pending for the user
     */
     struct UserInfo {
        uint256 amount;
        uint256 claimed;
        uint256 rewardDebt;
        uint256 pending;
        uint256 penaltyEndTime;
        bool penalized;
    }

    /**
     * @notice Defines the pool state and config parameters
     * @dev stakeToken The address of the ERC721 staking token
     * @dev rewardToken The address of the ERC20 reward token
     * @dev startTime The start time of the pool
     * @dev endTime The end time of the pool
     * @dev rewardTokenPerSecond The reward distribution rate per second
     * @dev totalStaked: Total tokens staked
     * @dev totalClaimed: Total rewards claimed
     * @dev lastUpdateTimestamp: The timestamp of the last update
     * @dev accRewardPerShare: Accumulated rewards per staked token
     * @dev stakedTokens: Mapping tokenIds to owner addresses
     */
    struct PenaltyPool {
        IERC721 stakeToken;
        IERC20 rewardToken;
        uint256 startTime;
        uint256 endTime;
        uint256 penaltyPeriod;
        uint256 rewardTokenPerSecond;
        uint256 totalStaked;
        uint256 totalClaimed;
        uint256 totalPenalties;
        uint256 lastUpdateTimestamp;
        uint256 accRewardPerShare;
        address adminWallet;
        mapping(uint256 => address) stakedTokens;
    }
    
    /**
     *  ERROR MESSAGES
     */
    /// @dev Error to indicate that tokens are still in LockUp and cannot be claimed
    /// @param currentTime The current timestamp
    /// @param unlockTime The timestamp when the tokens will be unlocked for claim
    error ClaimInLockUp(uint256 currentTime, uint256 unlockTime);
    /// @dev Error to indicate an invalid penalty duration for unstaking
    error InvalidPenaltyPeriod();
    /// @dev Error to indicate that the caller is not the admin
    error NotAdmin();

    /**
     *  EVENTS
     */
    
    /**
     * @notice Event to notify when an admin claims accumulated fees
     * @dev Emitted in 'claim' function
     * @param amount The amount of fees claimed
     */
    event FeeClaim(uint256 amount);
}
