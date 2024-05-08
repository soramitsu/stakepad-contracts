// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IERC721BasePool {
    /**
     *  ERROR MESSAGES
     */

    /**
     * @dev Error to indicate an invalid staking period
     */
    error InvalidStakingPeriod();

    /**
     * @dev Error to indicate an invalid start time for the staking pool
     */
    error InvalidStartTime();

    /**
     * @notice Error emitted when attempting to stake zero tokens.
     */
    error ZeroStakingTokens();

    /**
     * @notice Error emitted when attempting to unstake more tokens than the user has staked.
     */
    error NotEnoughTokens();

    /**
     * @notice Error emitted when a user other than the owner of a token attempts to unstake it.
     */
    error NotStaker();

    /**
     * @notice Error emitted when attempting an operation but no user account is found.
     */
    error UserNotFound();

    /**
     * @notice Error emitted when attempting to claim rewards but there are none available.
     */
    error NothingToClaim();

    /**
     * @notice Error emitted when attempting an operation before the pool has started.
     */
    error PoolNotStarted();

    /**
     * @notice Error emitted when attempting an operation while pool is not active.
     */
    error PoolNotActive();
    /**
     * @notice Error emitted when attempting an operation while pool is not active.
     */
    error NotAdmin();

    // **Events**

    /**
     * @notice Event emitted when tokens are staked into the pool.
     * @param user The address of the user who staked the tokens.
     * @param tokenIds The IDs of the staked tokens.
     */
    event Staked(address indexed user, uint256[] indexed tokenIds);

    /**
     * @notice Event emitted when tokens are unstaked from the pool.
     * @param user The address of the user who unstaked the tokens.
     * @param tokenIds The IDs of the unstaked tokens.
     */
    event UnStaked(address indexed user, uint256[] indexed tokenIds);

    /**
     * @notice Event emitted when a user claims their rewards.
     * @param user The address of the user who claimed the rewards.
     * @param pending The amount of rewards claimed.
     */
    event Claim(address indexed user, uint256 pending);

    /**
     * @notice Event emitted when the pool parameters are updated
     * @param totalStaked Total number of tokens staked in the pool.
     * @param accumulatedRewardTokenPerShare Accumulated reward tokens per staked share.
     * @param lastBlockNumber Block number where the update happened.
     */
    event UpdatePool(
        uint256 indexed totalStaked,
        uint256 indexed accumulatedRewardTokenPerShare,
        uint256 lastBlockNumber
    );

    // **Structs**

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
    struct BasePoolInfo {
        IERC721 stakeToken;
        IERC20 rewardToken;
        uint256 startTime;
        uint256 endTime;
        uint256 unstakeLockupTime;
        uint256 claimLockupTime;
        uint256 rewardTokenPerSecond;
        uint256 totalStaked;
        uint256 totalClaimed;
        uint256 lastUpdateTimestamp;
        uint256 accRewardPerShare;
        bool isActive;
        address adminWallet;
        mapping(address => BaseUserInfo) userInfo;
        mapping(uint256 => address) stakedTokens;
    }

    /**
     * @notice Storage for a user's staking information
     * @dev amount Number of tokens staked by the user.
     * @dev claimed The amount of rewards already claimed by the user
     * @dev rewardDebt Used to calculate rewards efficiently
     * @dev pending The amount of rewards pending for the user
     */
    struct BaseUserInfo {
        uint256 amount;
        uint256 claimed;
        uint256 rewardDebt;
        uint256 pending;
    }

    // **External Functions**

    /**
     * @notice Allows users to stake ERC721 tokens into the pool.
     * @param _tokenIds An array of token IDs to be staked.
     */
    function stake(uint256[] calldata _tokenIds) external;

    /**
     * @notice Allows users to unstake their ERC721 tokens from the pool.
     * @param _tokenIds An array of token IDs to be unstaked.
     */
    function unstake(uint256[] calldata _tokenIds) external;

    /**
     * @notice Allows users to claim their pending rewards.
     */
    function claim() external;
}
