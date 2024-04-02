/*
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.24;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract  ERC20StakingPool is ReentrancyGuard, Ownable (msg.sender){

    using SafeERC20 for IERC20;
    error InsufficientAmount(uint256 amount);

    IERC20 stakeToken;
    IERC20 rewardToken;
    uint256 rewardTokenPerBlock;
    uint256 totalStaked;
    uint256 totalClaimed;
    uint256 lastAccessedBlock;
    uint256 accumulatedRewardTokenPerShare;
    uint256 lockupPeriod;
    bool isActive;
    mapping (address => User) userInfo;
    address public adminAddress;

    struct User{
        uint256 amount;
        uint256 claimed;
        uint256 rewardDebt;
        uint256 unclaimed;
        uint256 stakeTimestamp;
    }

    //Events
    event Stake(address user, uint256 amount);
    event Unstake(address user, uint256 amount);
    event Claim(address user, uint256 amount);
    event ActivatePool();
    event UpdatePool(uint256 totalStaked, uint256 accumulatedRewardTokenPerShare, uint256 lastBlockNumber);
    

    constructor(address _sToken, address _rToken, uint256 rPerBlck, uint256 _lockUpPeriod){
        stakeToken = IERC20(_sToken);
        rewardToken = IERC20(_rToken);
        rewardTokenPerBlock = rPerBlck;
        lastAccessedBlock = block.timestamp;
        adminAddress = msg.sender;
        isActive = false;
        lockupPeriod = _lockUpPeriod;
    }

    function collectCreationFee (uint256 amount) internal {
        uint256 percent = (amount * 3) / 100;
        stakeToken.transferFrom(msg.sender, adminAddress, percent);
        amount = amount - percent;
    }

    function setUserPendingRewards() internal returns (uint256){
        User storage user = userInfo[msg.sender];
        uint256 pendingReward = (user.amount * accumulatedRewardTokenPerShare) - user.rewardDebt ;
        user.unclaimed += pendingReward;
        user.rewardDebt = user.amount * accumulatedRewardTokenPerShare;
        return pendingReward;
    }

    function updatePool() internal {
        if(block.timestamp > lastAccessedBlock){
            if(totalStaked > 0 ){
                uint256 blockDifference = block.timestamp - lastAccessedBlock;
                uint256 totalNewReward = rewardTokenPerBlock * blockDifference;
                accumulatedRewardTokenPerShare += totalNewReward/totalStaked;
            }
            lastAccessedBlock = block.timestamp;
            emit UpdatePool(totalStaked, accumulatedRewardTokenPerShare, block.timestamp);
        }
    }

    function viewTokens(address user_address) public view returns(uint256 pendingReward)  { 
        if(block.timestamp > lastAccessedBlock && totalStaked > 0){
            uint256 blockDifference = block.timestamp - lastAccessedBlock;
            uint256 totalNewReward = rewardTokenPerBlock * blockDifference;
            uint256 accummulateRewardTokenPerShare = totalNewReward/totalStaked;
            User storage user = userInfo[user_address];
            pendingReward = (user.amount * accummulateRewardTokenPerShare) - user.rewardDebt ;          
        } 
        return pendingReward;
    }


    function stake(uint256 amount) external {
        setUserPendingRewards();
        userInfo[msg.sender].amount += amount;
        totalStaked += amount;
        collectCreationFee(amount);
        stakeToken.safeTransferFrom(msg.sender, address(this) , amount);

        emit Stake(msg.sender, amount);

        updatePool();
    }

    function unstake(uint256 amount) external nonReentrant{
        setUserPendingRewards();
        User storage user = userInfo[msg.sender];
        if (user.amount < amount)
            revert InsufficientAmount(user.amount);
        require(block.timestamp >= user.stakeTimestamp + lockupPeriod, "tokens are in lock-up");
        user.amount -= amount;
        totalStaked -= amount;
        stakeToken.safeTransfer(msg.sender, amount);

        emit Unstake(msg.sender,  amount);

        updatePool();
    }

    function claim() external nonReentrant{
        User storage user = userInfo[msg.sender];

        if (user.amount < 100)
            revert InsufficientAmount(user.amount);

        uint256 pendingRewards = setUserPendingRewards();
        user.claimed += pendingRewards;
        totalClaimed += pendingRewards;
        rewardToken.safeTransfer(msg.sender, pendingRewards);
        emit Claim(msg.sender, pendingRewards);

        updatePool();
    }

    function activate() public  {
        isActive = true;
        emit ActivatePool();
    }
}