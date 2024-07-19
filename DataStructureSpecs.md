

# Data Structures Specification

## ERC20 Pool Contracts

### UserInfo (ERC20)
- **Description**: This structure stores information about a user's staking activity in the pool.
- **Attributes**:
  - `amount`: The number of tokens staked by the user.
  - `claimed`: The amount of rewards already claimed by the user.
  - `rewardDebt`: The reward debt used for calculating pending rewards.
  - `pending`: The amount of rewards pending for the user.
- **Usage**:
  - Used to keep track of individual user's staking details and calculate rewards.

### LockUpPool
- **Description**: This structure stores the configuration and state of an ERC20 lock-up pool.
- **Attributes**:
  - `stakeToken`: The address of the ERC20 staking token.
  - `rewardToken`: The address of the ERC20 reward token.
  - `startTime`: The start time of the pool.
  - `endTime`: The end time of the pool.
  - `unstakeLockUpTime`: The lock-up period for unstaking.
  - `claimLockUpTime`: The lock-up period for claiming rewards.
  - `rewardTokenPerSecond`: The reward distribution rate per second.
  - `totalStaked`: The total number of tokens staked in the pool.
  - `totalClaimed`: The total rewards claimed from the pool.
  - `lastUpdateTimestamp`: The timestamp of the last update.
  - `accRewardPerShare`: The accumulated rewards per staked token.
- **Usage**:
  - Used to store the pool's parameters and track its state.

### PenaltyPool
- **Description**: This structure stores the configuration and state of an ERC20 penalty fee pool.
- **Attributes**:
  - `stakeToken`: The address of the ERC20 staking token.
  - `rewardToken`: The address of the ERC20 reward token.
  - `startTime`: The start time of the pool.
  - `endTime`: The end time of the pool.
  - `penaltyPeriod`: The penalty period for early unstaking.
  - `rewardTokenPerSecond`: The reward distribution rate per second.
  - `totalStaked`: The total number of tokens staked in the pool.
  - `totalClaimed`: The total rewards claimed from the pool.
  - `totalPenalties`: The total penalties collected.
  - `lastUpdateTimestamp`: The timestamp of the last update.
  - `accRewardPerShare`: The accumulated rewards per staked token.
  - `adminWallet`: The address of the admin wallet.
- **Usage**:
  - Used to store the pool's parameters and track its state, including penalty management.

## ERC721 Pool Contracts

### UserInfo (ERC721)
- **Description**: This structure stores information about a user's staking activity in the pool.
- **Attributes**:
  - `amount`: The number of tokens staked by the user.
  - `claimed`: The amount of rewards already claimed by the user.
  - `rewardDebt`: The reward debt used for calculating pending rewards.
  - `pending`: The amount of rewards pending for the user.
  - `penaltyEndTime`: The timestamp indicating the end of the penalty period.
  - `penalized`: Boolean indicating if the user is penalized.
- **Usage**:
  - Used to keep track of individual user's staking details and calculate rewards, including penalty management.

### LockUpPool (ERC721)
- **Description**: This structure stores the configuration and state of an ERC721 lock-up pool.
- **Attributes**:
  - `stakeToken`: The address of the ERC721 staking token.
  - `rewardToken`: The address of the ERC20 reward token.
  - `startTime`: The start time of the pool.
  - `endTime`: The end time of the pool.
  - `unstakeLockUpTime`: The lock-up period for unstaking.
  - `claimLockUpTime`: The lock-up period for claiming rewards.
  - `rewardTokenPerSecond`: The reward distribution rate per second.
  - `totalStaked`: The total number of tokens staked in the pool.
  - `totalClaimed`: The total rewards claimed from the pool.
  - `lastUpdateTimestamp`: The timestamp of the last update.
  - `accRewardPerShare`: The accumulated rewards per staked token.
- **Usage**:
  - Used to store the pool's parameters and track its state.

### PenaltyPool (ERC721)
- **Description**: This structure stores the configuration and state of an ERC721 penalty fee pool.
- **Attributes**:
  - `stakeToken`: The address of the ERC721 staking token.
  - `rewardToken`: The address of the ERC20 reward token.
  - `startTime`: The start time of the pool.
  - `endTime`: The end time of the pool.
  - `penaltyPeriod`: The penalty period for early unstaking.
  - `rewardTokenPerSecond`: The reward distribution rate per second.
  - `totalStaked`: The total number of tokens staked in the pool.
  - `totalClaimed`: The total rewards claimed from the pool.
  - `totalPenalties`: The total penalties collected.
  - `lastUpdateTimestamp`: The timestamp of the last update.
  - `accRewardPerShare`: The accumulated rewards per staked token.
  - `adminWallet`: The address of the admin wallet.
- **Usage**:
  - Used to store the pool's parameters and track its state, including penalty management.

## RequestManager Data Structures

### RequestPayload
- **Description**: This structure contains the payload data for a staking pool deployment request.
- **Attributes**:
  - `ipfsHash`: The IPFS hash of the request data.
  - `deployer`: The address of the deployer.
  - `factory`: The address of the factory contract.
  - `stakingData`: The encoded staking pool deployment parameters.
- **Usage**:
  - Used to store the payload data for deployment requests.

### Request
- **Description**: This structure contains the details of a staking pool deployment request.
- **Attributes**:
  - `requestStatus`: The status of the request.
  - `data`: The request payload data (`RequestPayload`).
- **Usage**:
  - Used to store and manage the lifecycle of deployment requests.

### Request Status Types
- **UNKNOWN**
- **CREATED**
- **DENIED**
- **APPROVED**
- **DEPLOYED**
- **CANCELED**


# Events and Errors Specification

## Common Events (ERC20 and ERC721)

### Stake
- **Description**: Emitted when a user stakes tokens.
- **Attributes**:
  - `user`: The address of the user who stakes tokens.
  - `amount` (ERC20) or `tokenIds` (ERC721): The amount of tokens staked (ERC20) or the IDs of the staked tokens (ERC721).

### Unstake
- **Description**: Emitted when a user unstakes tokens.
- **Attributes**:
  - `user`: The address of the user who unstakes tokens.
  - `amount` (ERC20) or `tokenIds` (ERC721): The amount of tokens unstaked (ERC20) or the IDs of the unstaked tokens (ERC721).

### Claim
- **Description**: Emitted when a user claims rewards.
- **Attributes**:
  - `user`: The address of the user who claims rewards.
  - `amount`: The amount of rewards claimed.
  - `penaltyAmount`: The amount deducted as a penalty fee.

### UpdatePool
- **Description**: Emitted when the staking pool is updated.
- **Attributes**:
  - `totalStaked`: The total amount of tokens staked in the pool.
  - `accumulatedRewardTokenPerShare`: The accumulated rewards per share.
  - `lastBlockTimestamp`: The timestamp of the last block with any user operation.


## Common Errors (ERC20 and ERC721)

### InvalidTokenAddress
- **Description**: Indicates an invalid token address.

### InvalidStakingPeriod
- **Description**: Indicates an invalid staking period.

### InvalidStartTime
- **Description**: Indicates an invalid start time for the staking pool.

### InvalidAmount
- **Description**: Indicates an invalid input amount for staking and unstaking operations.

### InsufficientAmount
- **Description**: Indicates an insufficient amount of tokens.
- **Attributes**:
  - `reqAmount`: The amount of tokens that is required.
  - `currentAmount`: The current amount of tokens.

### NothingToClaim
- **Description**: Indicates that the user has no available rewards to claim.

### PoolNotStarted
- **Description**: Indicates that the staking pool has not started yet.
- **Attributes**: None

### PoolHasEnded
- **Description**: Indicates that the staking pool has already ended.
- **Attributes**: None

### InvalidRewardRate
- **Description**: Indicates an invalid reward rate for the staking pool.
- **Attributes**: None

### TokensInLockUp
- **Description**: Indicates that tokens are still in lock-up and cannot be accessed.
- **Attributes**:
  - `currentTime`: The current timestamp.
  - `unlockTime`: The timestamp when the tokens will be unlocked.

### InvalidLockUpTime
- **Description**: Indicates an invalid lock-up time for unstaking or claiming rewards.
- **Attributes**: None

### NotStaker
- **Description**: Indicates that a user other than the owner of a token attempts to unstake it.
- **Attributes**: None

### InvalidPenaltyPeriod
- **Description**: Indicates an invalid penalty duration for unstaking.
- **Attributes**: None

### NotAdmin
- **Description**: Indicates that the caller is not the admin.
- **Attributes**: None

## RequestManager

### Events

#### RequestStatusChanged
- **Description**: Emitted when the status of a request changes.
- **Attributes**:
  - `id`: The ID of the request.
  - `status`: The new status of the request.

#### RequestFullfilled
- **Description**: Emitted when a request is fulfilled.
- **Attributes**:
  - `id`: The ID of the request.
  - `poolAddress`: The address of the deployed pool.

#### RequestSubmitted
- **Description**: Emitted when a new request is submitted.
- **Attributes**:
  - `id`: The ID of the request.
  - `data`: The payload data of the request.

#### FactoryRegistered
- **Description**: Emitted when a factory is registered.
- **Attributes**:
  - `factory`: The address of the factory.

#### FactoryUnregistered
- **Description**: Emitted when a factory is unregistered.
- **Attributes**:
  - `factory`: The address of the factory.

### Errors

#### InvalidId
- **Description**: Indicates an invalid request ID.
- **Attributes**: None

#### InvalidRequestStatus
- **Description**: Indicates an invalid request status.
- **Attributes**: None

#### InvalidDeployer
- **Description**: Indicates an invalid deployer address.
- **Attributes**: None

#### IpfsZeroHash
- **Description**: Indicates that the IPFS hash is zero.
- **Attributes**: None

#### InvalidAddress
- **Description**: Indicates an invalid address.
- **Attributes**: None

#### EmptyPayload
- **Description**: Indicates that the payload is empty.
- **Attributes**: None

#### UnregisteredFactory
- **Description**: Indicates that the factory is not registered.
- **Attributes**: None

#### AlreadyRegisteredFactory
- **Description**: Indicates that the factory is already registered.
- **Attributes**: None