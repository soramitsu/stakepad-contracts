/*SPDX-License-Identifier: MIT
*/
pragma solidity ^0.8.15;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract StakingPoolErc20 is ReentrancyGuard{

    using SafeERC20 for IERC20;
    error InsufficientAmount(uint256 amount);

    struct User {
        uint256 amount;
        uint256 claimed;
        uint256 pendingReward;
        uint256 rewardDebt;
    }

    struct Pool {
        uint256 totalStaked;
        uint256 totalClaimed;
        uint256 lastAccessedBlock;
        uint256 rewardTokenPerBlock;
        uint256 accumulatedRewardTokenPerShare;
        IERC20 stakeToken;
        IERC20 rewardToken;
        mapping (address => User) userInfo;
        bool isActive;
        string name;
    }
    //Events
    event Stake(address user, uint256 amount);
    event Unstake(address user, uint256 amount);
    event Claim(address user, uint256 amount);
    event UpdatePool(uint256 totalStaked, uint256 accumulatedRewardTokenPerShare, uint256 lastBlockNumber);
    event ActivatePool(bool status);

    Pool public pool;

    constructor(uint256 rewardTokenPerBlock, address stakeToken, address rewardToken, string memory name){
        pool.stakeToken = IERC20(stakeToken);
        pool.rewardToken = IERC20(rewardToken);
        pool.lastAccessedBlock = block.timestamp;
        pool.rewardTokenPerBlock = rewardTokenPerBlock;
        pool.name = name;
        pool.isActive = false;
    }


    function updatePool() internal {
        if(block.timestamp > pool.lastAccessedBlock){
            if(pool.totalStaked > 0 ){
                uint256 blockDifference = block.timestamp - pool.lastAccessedBlock;
                uint256 totalNewReward = pool.rewardTokenPerBlock * blockDifference;
                pool.accumulatedRewardTokenPerShare += totalNewReward/pool.totalStaked;
            }
            pool.lastAccessedBlock = block.timestamp;
            emit UpdatePool(pool.totalStaked, pool.accumulatedRewardTokenPerShare, block.timestamp);
        }
    }

    function setUserPendingRewards() internal returns (uint256){
        User storage user = pool.userInfo[msg.sender];
        uint256 pendingReward = (user.amount * pool.accumulatedRewardTokenPerShare) - user.rewardDebt ;
        user.pendingReward += pendingReward;
        user.rewardDebt = user.amount * pool.accumulatedRewardTokenPerShare;
        return pendingReward;
    }


    function viewTokens(address user_address) public view returns(uint256 pendingReward)  { 
        if(block.timestamp > pool.lastAccessedBlock && pool.totalStaked > 0){
            uint256 blockDifference = block.timestamp - pool.lastAccessedBlock;
            uint256 totalNewReward = pool.rewardTokenPerBlock * blockDifference;
            uint256 accumulatedRewardTokenPerShare = totalNewReward/pool.totalStaked;
            User storage user = pool.userInfo[user_address];
            pendingReward = (user.amount * accumulatedRewardTokenPerShare) - user.rewardDebt ;          
        } 
        return pendingReward;
    }


    function stake(uint256 amount) external {
        setUserPendingRewards();
        pool.userInfo[msg.sender].amount += amount;
        pool.totalStaked += amount;
        pool.stakeToken.safeTransferFrom(msg.sender, address(this) , amount);

        emit Stake(msg.sender, amount);

        updatePool();
    }

    function unstake(uint256 amount) external nonReentrant{
        setUserPendingRewards();
        User storage user = pool.userInfo[msg.sender];
        if (user.amount < amount)
            revert InsufficientAmount(user.amount);
        
        user.amount -= amount;
        pool.totalStaked -= amount;
        pool.stakeToken.safeTransfer(msg.sender, amount);

        emit Unstake(msg.sender,  amount);

        updatePool();
    }

    function claim() external nonReentrant{
        User storage user = pool.userInfo[msg.sender];

        if (user.amount < 100)
            revert InsufficientAmount(user.amount);

        uint256 pendingRewards = setUserPendingRewards();
        user.claimed += pendingRewards;
        pool.totalClaimed += pendingRewards;
        pool.rewardToken.safeTransfer(msg.sender, pendingRewards);
        emit Claim(msg.sender, pendingRewards);

        updatePool();
    }

    function activate() public {
        pool.isActive = true;
        emit ActivatePool(true);
    }

}