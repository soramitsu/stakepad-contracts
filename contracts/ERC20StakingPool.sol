/*
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract  ERC20StakingPool is ReentrancyGuard, Ownable{

    using SafeERC20 for IERC20;
    error InsufficientAmount(uint256 amount);
    error TokensInLockup(uint256 currentTime, uint256 unlockTime);
    error PoolNotStarted();
    error PoolEnded();
    error StartTimeOrLockUpTimeAfterEndTime();
    error PoolNotActive();
    error PoolLockUpPeriod();
    error NotAdmin();


    modifier onlyAdmin() {
        if(msg.sender == pool.adminAddress) revert NotAdmin();
        _;
    }
    modifier validPoolPeriod() {
        if(block.timestamp > pool.poolStartTime) revert PoolNotStarted();
        if(block.timestamp < pool.poolEndTime) revert PoolEnded();
    _;
    }
    modifier poolIsActive() {
        if (!pool.isActive) revert PoolNotActive();
        _;
    }
    modifier lockUpPeriod() {
        if (block.timestamp < pool.lockupPeriod) revert PoolLockUpPeriod();
        _;
    }

  
    struct User{
        uint256 amount;
        uint256 claimed;
        uint256 rewardDebt;
        uint256 unclaimed;
        uint256 stakeTimestamp;
    }

    struct Pool{
          IERC20 stakeToken;
    IERC20 rewardToken;
    uint256 rewardTokenPerBlock;
    uint256 totalStaked;
    uint256 totalClaimed;
    uint256 lastAccessedBlock;
    uint256 accumulatedRewardTokenPerShare;
    uint256 lockupPeriod;
    uint256 poolStartTime;
    uint256 poolEndTime;
    bool isActive;
    mapping (address => User) userInfo;
    address adminAddress;
    }
    Pool public pool;
    //Events
    event Stake(address user, uint256 amount);
    event Unstake(address user, uint256 amount);
    event Claim(address user, uint256 amount);
    event ActivatePool();
    event UpdatePool(uint256 totalStaked, uint256 accumulatedRewardTokenPerShare, uint256 lastBlockNumber);
    

    constructor(address _stakeToken, address _rewardToken, uint256 _rewardTokenPerBlock, uint256 _poolStartTime, uint256 _poolEndTime, uint256 _lockupPeriod, address _adminAddress){
        if(_poolStartTime > _poolEndTime || _lockupPeriod > _poolEndTime) revert StartTimeOrLockUpTimeAfterEndTime();
        pool.stakeToken = IERC20(_stakeToken);
        pool.rewardToken = IERC20(_rewardToken);
        pool.rewardTokenPerBlock = _rewardTokenPerBlock;
        pool.lastAccessedBlock = block.timestamp;
        pool.poolStartTime = _poolStartTime;
        pool.poolEndTime = _poolEndTime;
        pool.lockupPeriod = _lockupPeriod;
        pool.adminAddress = _adminAddress;
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

    function viewPendingReward(address userAddress) public view returns(uint256 pendingReward)  { 
        if(block.timestamp > pool.lastAccessedBlock && pool.totalStaked > 0){
            uint256 blockDifference = block.timestamp - pool.lastAccessedBlock;
            uint256 totalNewReward = pool.rewardTokenPerBlock * blockDifference;
            uint256 accummulateRewardTokenPerShare = totalNewReward/pool.totalStaked;
            User storage user = pool.userInfo[userAddress];
            pendingReward = (user.amount * accummulateRewardTokenPerShare) - user.rewardDebt ;          
        } 
        return pendingReward;
    }

    function stake(uint256 amount) external validPoolPeriod poolIsActive{
        updatePool();
        User storage user = pool.userInfo[msg.sender];
        user.unclaimed += (user.amount * pool.accumulatedRewardTokenPerShare) - user.rewardDebt ;
        user.rewardDebt = user.amount * pool.accumulatedRewardTokenPerShare;
        user.amount += amount;
        pool.totalStaked += amount;
        pool.stakeToken.safeTransferFrom(msg.sender, address(this) , amount);
        user.stakeTimestamp = block.timestamp;
        emit Stake(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant validPoolPeriod poolIsActive{
        updatePool();
        User storage user = pool.userInfo[msg.sender];
        if(block.timestamp < pool.lockupPeriod)
            revert TokensInLockup(block.timestamp, pool.lockupPeriod);
        if (user.amount > amount){
            user.unclaimed += (user.amount * pool.accumulatedRewardTokenPerShare) - user.rewardDebt ;
            user.rewardDebt = user.amount * pool.accumulatedRewardTokenPerShare;
            pool.userInfo[msg.sender].amount -= amount;
            pool.totalStaked -= amount;
            pool.stakeToken.safeTransfer(msg.sender, amount);

            emit Unstake(msg.sender,  amount);

            
        }
        else{revert InsufficientAmount(user.amount);}
        
    }

    function claim() external nonReentrant validPoolPeriod poolIsActive{
        updatePool();
        User storage user = pool.userInfo[msg.sender];
        if(block.timestamp < pool.lockupPeriod)
            revert TokensInLockup(block.timestamp, pool.lockupPeriod);
        user.unclaimed += (user.amount * pool.accumulatedRewardTokenPerShare) - user.rewardDebt ;
        user.rewardDebt = user.amount * pool.accumulatedRewardTokenPerShare;
        user.claimed += user.unclaimed;
        pool.totalClaimed += user.unclaimed;
        pool.rewardToken.safeTransfer(msg.sender, user.unclaimed);
        emit Claim(msg.sender, user.unclaimed);
        user.unclaimed = 0;
    }

    
    function activate() onlyAdmin external  {
        pool.isActive = true;
        emit ActivatePool();
    }
}