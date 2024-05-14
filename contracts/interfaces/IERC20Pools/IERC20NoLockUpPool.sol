// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;
import {IBasePoolERC20} from "./IERC20BasePool.sol";
interface IERC20NoLockUpPool is IBasePoolERC20 {
    struct UserInfo {
        uint256 amount; // Amount of tokens staked
        uint256 claimed; // Amount of claimed rewards
        uint256 rewardDebt; // Reward debt
        uint256 pending; // Pending rewards
    }

    struct Pool {
        address stakeToken; // ERC20 token being staked
        address rewardToken; // ERC20 token used for rewards
        uint256 startTime; // Start time of the staking pool
        uint256 endTime; // End time of the staking pool
        uint256 rewardTokenPerSecond; // Rate of rewards per second
        uint256 totalStaked; // Total amount of tokens staked
        uint256 totalClaimed; // Total amount of claimed rewards
        uint256 lastUpdateTimestamp; // Timestamp of the last reward update
        uint256 accRewardPerShare; // Accumulated rewards per share
    }
}
