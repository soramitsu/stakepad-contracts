pragma solidity 0.8.25;
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721BasePool} from "../../interfaces/IERC721/IERC721BasePool.sol";
import {IERC721LockUpPoolExtension} from "../../interfaces/IERC721/IERC721LockUpPoolExtension.sol";
contract ERC721LockUpStakingPool is
    ReentrancyGuard,
    Ownable,
    IERC721LockUpPoolExtension
{
    using SafeERC20 for IERC20;


    /// @dev Modifier to ensure that functions can only be executed when the pool is active and within the specified time range
    modifier validPool() {
        if (block.timestamp < pool.startTime) revert PoolNotStarted();
        if (!pool.isActive) revert PoolNotActive();
        _;
    }
    ///@dev Mapping to store user-specific staking information
    mapping(address => BaseUserInfo) public userInfo;

    /// @dev Modifier to allow only the admin to execute certain functions
    modifier onlyAdmin() {
        if (msg.sender != pool.adminWallet) revert NotAdmin();
        _;
    }

    Pool public pool;

    constructor(
        address stakeToken,
        address rewardToken,
        uint256 poolStartTime,
        uint256 poolEndTime,
        uint256 unstakeLockupTime,
        uint256 claimLockUpTime,
        uint256 rewardTokenPerSecond
    ) Ownable(msg.sender) {
        // Ensure the staking period is valid
        if (poolStartTime > poolEndTime) revert InvalidStakingPeriod();
        // Ensure the start time is in the future
        if (poolStartTime < block.timestamp) revert InvalidStartTime();
        // Ensure the lockup periods are valid
        if (unstakeLockupTime > poolEndTime || claimLockUpTime > poolEndTime)
            revert InvalidLockupTime();

        pool.stakeToken = IERC721(stakeToken);
        pool.rewardToken = IERC20(rewardToken);
        pool.startTime = poolStartTime;
        pool.endTime = poolEndTime;
        pool.unstakeLockupTime = unstakeLockupTime;
        pool.claimLockupTime = claimLockUpTime;
        pool.rewardTokenPerSecond = rewardTokenPerSecond;
        pool.lastUpdateTimestamp = block.timestamp;
    }

    /**
     * @dev See {IERC721BasePool-stake}.
     */
    function stake(uint256[] calldata _tokenIds) external validPool {
        //update parameters
        _updatePool();

        uint64 len = uint64(_tokenIds.length);
        if (len == 0) {
            revert ZeroStakingTokens();
        }

        for (uint64 i = 0; i < len; i++) {
            pool.stakeToken.safeTransferFrom(
                msg.sender,
                address(this),
                _tokenIds[i]
            );
            pool.stakedTokens[_tokenIds[i]] = msg.sender;
        }
        pool.userInfo[msg.sender].amount += len;
        pool.totalStaked += len;
        emit Staked(msg.sender, _tokenIds);
    }

    /**
     * @dev See {IERC721BasePool-unstake}.
     */
    function unstake(uint256[] calldata _tokenIds) external {
        uint256 _amount = _tokenIds.length;
        if (_amount > pool.userInfo[msg.sender].amount) {
            revert NotEnoughTokens();
        }
        _updatePool();

        for (uint256 i = _amount; i < _amount; i++) {
            if (pool.stakedTokens[_tokenIds[i]] != msg.sender) {
                revert NotStaker();
            }
            pool.stakeToken.safeTransferFrom(
                address(this),
                msg.sender,
                _tokenIds[i]
            );
            pool.stakedTokens[_tokenIds[1]] = address(0);
        }
        pool.userInfo[msg.sender].amount -= _amount;
        pool.totalStaked -= _amount;
        emit UnStaked(msg.sender, _tokenIds);
    }

    /**
     * @dev See {IERC721BasePool-claim}.
     */
    function claim() external nonReentrant {
        // Check if the current timestamp is before the claim lockup time
        if (block.timestamp < pool.claimLockupTime)
            revert TokensInLockup(block.timestamp, pool.claimLockupTime);

        // Update the pool
        _updatePool();

        // Get user information
        BaseUserInfo storage user = pool.userInfo[msg.sender];
        uint256 amount = user.amount;
        uint256 pending = user.pending;

        // Calculate pending rewards
        if (amount > 0) {
            pending += (amount * pool.accRewardPerShare) - user.rewardDebt;
            user.rewardDebt = (user.amount * pool.accRewardPerShare);
        }
        if (pending == 0) revert NothingToClaim();
        // Transfer pending rewards to the user
        user.pending = 0;
        unchecked {
            user.claimed += pending;
        }
        pool.totalClaimed += pending;
        pool.rewardToken.safeTransfer(msg.sender, pending);
        emit Claim(msg.sender, pending);
    }

    function _updatePool() internal {
        if (block.timestamp > pool.lastUpdateTimestamp) {
            if (pool.totalStaked > 0) {
                uint256 elapsedTime = _getMultiplier(
                    pool.lastUpdateTimestamp,
                    block.timestamp
                );
                pool.accRewardPerShare =
                    (elapsedTime * pool.rewardTokenPerSecond) /
                    pool.totalStaked;
                pool.lastUpdateTimestamp = block.timestamp;
                emit UpdatePool(
                    pool.totalStaked,
                    pool.accRewardPerShare,
                    pool.lastUpdateTimestamp
                );
            }
        }
    }
    function _getMultiplier(
        uint256 _from,
        uint256 _to
    ) internal view returns (uint256) {
        if (_from > pool.endTime) {
            return 0;
        }
        if (_to <= pool.endTime) {
            return _to - _from;
        } else {
            return pool.endTime - _from;
        }
    }
}
