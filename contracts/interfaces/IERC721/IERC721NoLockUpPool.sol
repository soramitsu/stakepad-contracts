// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721BasePool} from "./IERC721BasePool.sol";

interface IERC721NoLockUpPool is IERC721BasePool{

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
        mapping(uint256 => address) stakedTokens;
    }
}
