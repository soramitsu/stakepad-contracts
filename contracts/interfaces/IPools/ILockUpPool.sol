// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

interface ILockUpPoolStorage {
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
     * @dev stakeToken The address of the staking token
     * @dev rewardToken The address of the reward token
     * @dev startTime The start time of the pool
     * @dev endTime The end time of the pool
     * @dev unstakeLockUpTime The LockUp time (in unixtimestamp) before unstaking
     * @dev claimLockUpTime The LockUp time (in unixtimestamp) before claiming rewards
     * @dev rewardTokenPerSecond The reward distribution rate per second
     * @dev totalStaked: Total tokens staked
     * @dev totalClaimed: Total rewards claimed
     * @dev lastUpdateTimestamp: The timestamp of the last update
     * @dev accRewardPerShare: Accumulated rewards per staked token
     */
    struct LockUpPool {
        address stakeToken;
        address rewardToken;
        uint256 startTime;
        uint256 endTime;
        uint256 unstakeLockUpTime; // LockUp period for unstaking
        uint256 claimLockUpTime; // LockUp period for claiming rewards
        uint256 rewardTokenPerSecond;
        uint256 totalStaked;
        uint256 totalClaimed;
        uint256 lastUpdateTimestamp;
        uint256 accRewardPerShare;
    }

    /**
     *  ERROR MESSAGES
     */
}
