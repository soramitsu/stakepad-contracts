// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPoolERC721 {
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
    error InvalidAmount();

    /**
     * @dev Error to indicate insufficient amount of tokens
     * @param reqAmount The amount of tokens that is required
     * @param currentAmount The current amount of tokens
     */
    error InsufficientAmount(uint256 reqAmount, uint256 currentAmount);

    /**
     * @notice Error emitted when a user other than the owner of a token attempts to unstake it.
     */
    error NotStaker();

    /**
     * @notice Error emitted when attempting to claim rewards but there are none available.
     */
    error NothingToClaim();

    /**
     * @notice Error emitted when attempting an operation before the pool has started.
     */
    error PoolNotStarted();

    /**
     * @notice Error emitted when attempting an operation after the pool has ended.
     */
    error PoolHasEnded();
    
    // **Events**
    /**
     * @notice Event emitted when tokens are staked into the pool.
     * @param user The address of the user who staked the tokens.
     * @param tokenIds The IDs of the staked tokens.
     */
    event Stake(address indexed user, uint256[] indexed tokenIds);

    /**
     * @notice Event emitted when tokens are unstaked from the pool.
     * @param user The address of the user who unstaked the tokens.
     * @param tokenIds The IDs of the unstaked tokens.
     */
    event Unstake(address indexed user, uint256[] indexed tokenIds);

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

    /**
     * @notice Function to calculate pending rewards for a user
     * @param userAddress Address of the user
     * @return pending rewards
     */
    function pendingRewards(
        address userAddress
    ) external view returns (uint256);
}
