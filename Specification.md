# Let's generate the specification content up to the smart contracts section with proper internal references.

specification_content = """
# Stake Pad Project Specification Document

## Introduction

### Project Overview
**Brief description of Stake Pad**  
Stake Pad is a Web3 staking pool platform designed to facilitate decentralized staking for both [ERC20](https://ethereum.org/en/developers/docs/standards/tokens/erc-20/) and [ERC721](https://ethereum.org/en/developers/docs/standards/tokens/erc-721/) tokens. It allows users to earn rewards by staking their tokens in various pools, each with its own set of rules and rewards structure. Stake Pad supports different types of staking mechanisms, including lock-up periods and penalty fees for early unstaking.

**Core features and functionalities**
- **ERC20 and ERC721 Staking Pools**: Supports staking for both fungible ([ERC20](#erc20)) and non-fungible tokens ([ERC721](#erc721)).
- **Lock-Up Mechanisms**: Pools with specific lock-up periods where staked tokens cannot be withdrawn until the period ends.
- **Penalty Fees**: Pools that charge a penalty fee for early unstaking.
- **Reward Distribution**: Automatic reward distribution based on staking duration and amount.
- **Factory Contracts**: Factory contracts for deploying staking pools with customizable parameters.
- **Request Management**: A request management system for creating and approving staking pool deployments.

### Purpose and Scope
**Purpose of the document**  
The purpose of this document is to provide a comprehensive specification for the Stake Pad project. It details the architecture, smart contracts, data structures, events, error handling, security considerations, and deployment procedures.

**Scope of the project**  
This document covers the following:
- System architecture
- Detailed descriptions of smart contracts
- Data structures and storage
- Events and error handling mechanisms
- Security considerations
- Deployment and migration steps

### Terminology and Definitions
**Key terms and definitions used in the project**

- **Stake Pad**: The decentralized platform for staking pools.
- **Staking Pool**: A smart contract where users can stake tokens to earn rewards.
- **ERC20**: A standard for fungible tokens on the Ethereum blockchain.
- **ERC721**: A standard for non-fungible tokens (NFTs) on the Ethereum blockchain.
- **Lock-Up Period**: A specified period during which staked tokens cannot be withdrawn from the pool.
  - *Code Reference*: `uint256 unstakeLockUpTime; uint256 claimLockUpTime;` in `LockUpPool` struct.
- **Penalty Fee**: A fee imposed for early unstaking before the end of the lock-up period.
  - *Code Reference*: `uint256 penaltyPeriod;` in `PenaltyPool` struct.
- **Reward Token**: The token distributed as a reward for staking.
  - *Code Reference*: `address rewardToken;` in `LockUpPool` and `PenaltyPool` structs.
- **Staking Token**: The token that users stake in the pool.
  - *Code Reference*: `address stakeToken;` in `LockUpPool` and `PenaltyPool` structs.
- **Deployment**: The process of creating and initializing a smart contract on the Ethereum blockchain.
- **IPFS**: InterPlanetary File System, used for decentralized storage and sharing of data.
- **Reward Calculation**: The process of determining the rewards earned by a user based on their staked amount and the time period.
  - *Code Reference*: `pendingRewards(address userAddress) external view returns (uint256);` in staking pool contracts.
- **Penalty Fee Calculation**: The calculation of penalties for early unstaking.
  - *Code Reference*: `_calculatePenalizedAmount(bool penalized, uint256 _amountToPenalize) internal pure returns (uint256);` in `ERC20PenaltyFeePool` and `ERC721PenaltyFeePool` contracts.

**Contract-Specific Terms**
- **GenericFactory**: A base factory contract for creating staking pools.
  - *Code Reference*: `contract GenericFactory`.
- **ERC20LockUpStakingFactory**: A factory contract for creating ERC20 lock-up staking pools.
  - *Code Reference*: `contract ERC20LockUpStakingFactory`.
- **ERC20PenaltyFeeStakingFactory**: A factory contract for creating ERC20 staking pools with penalty fees.
  - *Code Reference*: `contract ERC20PenaltyFeeStakingFactory`.
- **ERC20LockUpPool**: A staking pool contract for ERC20 tokens with lock-up periods.
  - *Code Reference*: `contract ERC20LockUpPool`.
- **ERC20PenaltyFeePool**: A staking pool contract for ERC20 tokens with penalty fees.
  - *Code Reference*: `contract ERC20PenaltyFeePool`.
- **ERC721LockUpPool**: A staking pool contract for ERC721 tokens with lock-up periods.
  - *Code Reference*: `contract ERC721LockUpPool`.
- **ERC721PenaltyFeePool**: A staking pool contract for ERC721 tokens with penalty fees.
  - *Code Reference*: `contract ERC721PenaltyFeePool`.
- **ERC20MockToken**: A mock ERC20 token used for testing.
  - *Code Reference*: `contract ERC20MockToken`.
- **ERC721MockToken**: A mock ERC721 token used for testing.
  - *Code Reference*: `contract ERC721MockToken`.
- **RequestManager**: A contract for managing requests for deploying staking pools.
  - *Code Reference*: `contract RequestManager`.

# Smart Contracts

## Management Contracts

**RequestManager**
- **Description**: Handles the lifecycle of staking pool deployment requests, from creation and approval to deployment. Ensures only approved requests are deployed and manages the list of deployed pools.
- **Constructor**: Initializes the contract with the owner.
- **Functions**:
  - `requestDeployment(RequestPayload calldata data)`: Allows users to request the deployment of a new staking pool.
  - `approveRequest(uint256 id)`: Allows the owner to approve a deployment request.
  - `denyRequest(uint256 id)`: Allows the owner to deny a deployment request.
  - `cancelRequest(uint256 id)`: Allows the deployer to cancel their request.
  - `deploy(uint256 id)`: Deploys the staking pool for approved requests.
  - `addFactory(address factory)`: Adds a new factory to the whitelist.
  - `removeFactory(address factory)`: Removes a factory from the whitelist.
- **Derived Interfaces**: `IRequestManager`

## Factory Contracts

**ERC20LockUpStakingFactory**
- **Description**: Factory contract for creating ERC20 lock-up staking pools.
- **Constructor**: Initializes the contract with the manager contract address.
- **Functions**:
  - `deploy(address deployer, bytes calldata payload)`: Deploys a new ERC20 lock-up staking pool with specified parameters.
- **Derived Interfaces**: `ILockUpFactory`, `IGenericFactory`

**ERC20PenaltyFeeStakingFactory**
- **Description**: Factory contract for creating ERC20 staking pools with penalty fees.
- **Constructor**: Initializes the contract with the manager contract address.
- **Functions**:
  - `deploy(address deployer, bytes calldata payload)`: Deploys a new ERC20 penalty fee staking pool with specified parameters.
- **Derived Interfaces**: `IPenaltyFeeFactory`, `IGenericFactory`

**ERC721LockUpStakingFactory**
- **Description**: Factory contract for creating ERC721 lock-up staking pools.
- **Constructor**: Initializes the contract with the manager contract address.
- **Functions**:
  - `deploy(address deployer, bytes calldata payload)`: Deploys a new ERC721 lock-up staking pool with specified parameters.
- **Derived Interfaces**: `ILockUpFactory`, `IGenericFactory`

**ERC721PenaltyFeeStakingFactory**
- **Description**: Factory contract for creating ERC721 staking pools with penalty fees.
- **Constructor**: Initializes the contract with the manager contract address.
- **Functions**:
  - `deploy(address deployer, bytes calldata payload)`: Deploys a new ERC721 penalty fee staking pool with specified parameters.
- **Derived Interfaces**: `IPenaltyFeeFactory`, `IGenericFactory`


## Main Contracts

**ERC20LockUpPool**
- **Description**: A staking pool contract for ERC20 tokens with lock-up periods. Manages staking, unstaking, and reward distribution.
- **Constructor**: Initializes the pool with specified parameters including staking token, reward token, start and end times, reward rate, and lock-up periods.
- **Functions**:
  - `stake(uint256 amount)`: Allows users to stake tokens.
  - `unstake(uint256 amount)`: Allows users to unstake tokens after the lock-up period.
  - `claim()`: Allows users to claim their pending rewards.
  - `pendingRewards(address userAddress)`: Returns the pending rewards for a user.
  - `_updatePool()`: Internal function to update the pool's state.
  - `_getMultiplier(uint256 _from, uint256 _to)`: Internal function to calculate the reward multiplier.
- **Derived Interfaces**: `IPoolERC20`, `ILockUpPoolStorage`, `IPoolErrors`

**ERC20PenaltyFeePool**
- **Description**: A staking pool contract for ERC20 tokens with penalty fees. Manages staking, unstaking with penalties, and reward distribution.
- **Constructor**: Initializes the pool with specified parameters including staking token, reward token, start and end times, reward rate, and penalty period.
- **Functions**:
  - `stake(uint256 amount)`: Allows users to stake tokens.
  - `unstake(uint256 amount)`: Allows users to unstake tokens, applying a penalty if within the penalty period.
  - `claim()`: Allows users to claim their pending rewards.
  - `claimFee()`: Allows the admin to claim accumulated penalty fees.
  - `pendingRewards(address userAddress)`: Returns the pending rewards for a user.
  - `_updatePool()`: Internal function to update the pool's state.
  - `_calculatePenalizedAmount(bool penalized, uint256 _amountToPenalize)`: Internal function to calculate the penalty amount.
  - `_getMultiplier(uint256 _from, uint256 _to)`: Internal function to calculate the reward multiplier.
- **Derived Interfaces**: `IPoolERC20`, `IPenaltyFeePoolStorage`, `IPoolErrors`

## ERC721 Contracts

**ERC721LockUpPool**
- **Description**: A staking pool contract for ERC721 tokens with lock-up periods. Manages staking, unstaking, and reward distribution.
- **Constructor**: Initializes the pool with specified parameters including staking token, reward token, start and end times, reward rate, and lock-up periods.
- **Functions**:
  - `stake(uint256[] calldata tokenIds)`: Allows users to stake tokens.
  - `unstake(uint256[] calldata tokenIds)`: Allows users to unstake tokens after the lock-up period.
  - `claim()`: Allows users to claim their pending rewards.
  - `pendingRewards(address userAddress)`: Returns the pending rewards for a user.
  - `_updatePool()`: Internal function to update the pool's state.
  - `_getMultiplier(uint256 _from, uint256 _to)`: Internal function to calculate the reward multiplier.
- **Derived Interfaces**: `IPoolERC721`, `ILockUpPoolStorage`, `IPoolErrors`

**ERC721PenaltyFeePool**
- **Description**: A staking pool contract for ERC721 tokens with penalty fees. Manages staking, unstaking with penalties, and reward distribution.
- **Constructor**: Initializes the pool with specified parameters including staking token, reward token, start and end times, reward rate, and penalty period.
- **Functions**:
  - `stake(uint256[] calldata tokenIds)`: Allows users to stake tokens.
  - `unstake(uint256[] calldata tokenIds)`: Allows users to unstake tokens, applying a penalty if within the penalty period.
  - `claim()`: Allows users to claim their pending rewards.
  - `claimFee()`: Allows the admin to claim accumulated penalty fees.
  - `pendingRewards(address userAddress)`: Returns the pending rewards for a user.
  - `_updatePool()`: Internal function to update the pool's state.
  - `_calculatePenalizedAmount(bool penalized, uint256 _amountToPenalize)`: Internal function to calculate the penalty amount.
  - `_getMultiplier(uint256 _from, uint256 _to)`: Internal function to calculate the reward multiplier.
- **Derived Interfaces**: `IPoolERC721`, `IPenaltyFeePoolStorage`, `IPoolErrors`

## Notable Function Logic

### ERC20 Pool Contracts

### _updatePool()
- **Description**: Updates the state of the pool by recalculating the accumulated rewards per share and the last update timestamp.
- **Parameters**: None
- **Calling Functions**: 
  - `stake(uint256 amount)`
  - `unstake(uint256 amount)`
  - `claim()`
- **Logic**:
  1. **Elapsed Period Calculation**:
     - Calculates the elapsed period as `Elapsed Period = Current Timestamp - Last Update Timestamp`.
  2. **Accrued Rewards Calculation**:
     - Computes the total new rewards accrued over the elapsed period:  
       `Total New Reward = Reward Rate per Second * Elapsed Period`.
     - Updates the accumulated rewards per share:  
       `Acc. Reward Per Share += (Total New Reward * Precision Factor) / Total Staked Tokens`.
  3. **Update Timestamp**:
     - Sets the last update timestamp to the current timestamp.

### pendingRewards(address userAddress)
- **Description**: Returns the pending rewards for a specific user.
- **Parameters**: `userAddress` - the address of the user.
- **Calling Functions**: 
  - External view function, called directly by users or other contracts.
- **Logic**:
  1. **User and Share Calculation**:
     - Retrieves user info and calculates the updated accumulated reward per share.
     - If the current timestamp is greater than the last update timestamp and there are staked tokens:
       - `Elapsed Period = Current Timestamp - Last Update Timestamp`.
       - `Total New Reward = Reward Rate per Second * Elapsed Period`.
       - `Updated Acc. Reward Per Share = Acc. Reward Per Share + (Total New Reward * Precision Factor) / Total Staked Tokens`.
  2. **Pending Rewards Calculation**:
     - Computes the pending rewards:  
       `Pending Rewards = User Pending Rewards + ((User Amount * Updated Acc. Reward Per Share) / Precision Factor) - User Reward Debt`.

### _getMultiplier(uint256 _from, uint256 _to)
- **Description**: Calculates the reward multiplier over a given period.
- **Parameters**: 
  - `_from` - start timestamp.
  - `_to` - end timestamp.
- **Calling Functions**: 
  - [`_updatePool()`](#_updatepool)
  - [`pendingRewards(address userAddress)`](#pendingrewardsaddress-useraddress)
- **Logic**:
  - If `_to` is within the staking period:  
    `Multiplier = _to - _from`.
  - If `_from` is after the pool end time:  
    `Multiplier = 0`.
  - If `_to` exceeds the pool end time:  
    `Multiplier = Pool End Time - _from`.

### _calculatePenalizedAmount(bool penalized, uint256 _amountToPenalize)
- **Description**: Calculates the penalty amount for early unstaking.
- **Parameters**: 
  - `penalized` - boolean indicating if the user is penalized, determined by conditions in `unstake(uint256 amount)` and `claim()`.
  - `_amountToPenalize` - the amount to penalize, passed by `unstake(uint256 amount)` and `claim()`.
- **Calling Functions**: 
  - `unstake(uint256 amount)`
  - `claim()`
- **Logic**:
  - If the user is penalized:  
    `Penalty Amount = (_amountToPenalize * Penalty Fee) / 10000`.
  - Otherwise:  
    `Penalty Amount = (_amountToPenalize * Collectable Fee) / 10000`.

## ERC721 Pool Contracts

### _updatePool()
- **Description**: Updates the state of the pool by recalculating the accumulated rewards per share and the last update timestamp.
- **Parameters**: None
- **Calling Functions**: 
  - `stake(uint256[] calldata tokenIds)`
  - `unstake(uint256[] calldata tokenIds)`
  - `claim()`
- **Logic**:
  1. **Elapsed Period Calculation**:
     - Calculates the elapsed period as `Elapsed Period = Current Timestamp - Last Update Timestamp`.
  2. **Accrued Rewards Calculation**:
     - Computes the total new rewards accrued over the elapsed period:  
       `Total New Reward = Reward Rate per Second * Elapsed Period`.
     - Updates the accumulated rewards per share:  
       `Acc. Reward Per Share += (Total New Reward * Precision Factor) / Total Staked Tokens`.
  3. **Update Timestamp**:
     - Sets the last update timestamp to the current timestamp.

### pendingRewards(address userAddress)
- **Description**: Returns the pending rewards for a specific user.
- **Parameters**: `userAddress` - the address of the user.
- **Calling Functions**: 
  - External view function, called directly by users or other contracts.
- **Logic**:
  1. **User and Share Calculation**:
     - Retrieves user info and calculates the updated accumulated reward per share.
     - If the current timestamp is greater than the last update timestamp and there are staked tokens:
       - `Elapsed Period = Current Timestamp - Last Update Timestamp`.
       - `Total New Reward = Reward Rate per Second * Elapsed Period`.
       - `Updated Acc. Reward Per Share = Acc. Reward Per Share + (Total New Reward * Precision Factor) / Total Staked Tokens`.
  2. **Pending Rewards Calculation**:
     - Computes the pending rewards:  
       `Pending Rewards = User Pending Rewards + ((User Amount * Updated Acc. Reward Per Share) / Precision Factor) - User Reward Debt`.

### _getMultiplier(uint256 _from, uint256 _to)
- **Description**: Calculates the reward multiplier over a given period.
- **Parameters**: 
  - `_from` - start timestamp, passed by `_updatePool()` and `pendingRewards()`.
  - `_to` - end timestamp, passed by `_updatePool()` and `pendingRewards()`.
- **Calling Functions**: 
  - `_updatePool()`
  - `pendingRewards(address userAddress)`
- **Logic**:
  - If `_to` is within the staking period:  
    `Multiplier = _to - _from`.
  - If `_from` is after the pool end time:  
    `Multiplier = 0`.
  - If `_to` exceeds the pool end time:  
    `Multiplier = Pool End Time - _from`.

### _calculatePenalizedAmount(bool penalized, uint256 _amountToPenalize)
- **Description**: Calculates the penalty amount for early unstaking.
- **Parameters**: 
  - `penalized` - boolean indicating if the user is penalized, determined by conditions in `unstake(uint256[] calldata tokenIds)` and `claim()`.
  - `_amountToPenalize` - the amount to penalize, passed by `unstake(uint256[] calldata tokenIds)` and `claim()`.
- **Calling Functions**: 
  - `unstake(uint256[] calldata tokenIds)`
  - `claim()`
- **Logic**:
  - If the user is penalized:  
    `Penalty Amount = (_amountToPenalize * Penalty Fee) / 10000`.
  - Otherwise:  
    `Penalty Amount = (_amountToPenalize * Collectable Fee) / 10000`.




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



# Security Concerns

In the development of the Stake Pad smart contracts, various security considerations have been addressed to ensure the integrity, reliability, and safety of the platform. This section outlines the primary security measures implemented in the code, providing references to the corresponding parts of the codebase where these measures are applied.

## Reentrancy Guard

### Description
Reentrancy attacks occur when an attacker exploits the contract's external calls to repeatedly enter the same function, potentially draining funds or manipulating state variables. To mitigate this, the `ReentrancyGuard` from OpenZeppelin is used.

### Implementation
- **Location**: All staking and unstaking functions.
- **Code Reference**: 
  ```solidity
  import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
  ```
- **Reference**: [OpenZeppelin ReentrancyGuard](https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard)

### Usage
- **Functions**: `stake`, `unstake`, `claim`
- **Example**: 
  ```solidity
  function stake(uint256 amount) external nonReentrant { ... }
  ```

## SafeERC20 Library

### Description
The `SafeERC20` library from OpenZeppelin is employed to handle ERC20 token transfers safely. It ensures that operations revert if the token contract returns false or reverts.

### Implementation
- **Location**: All ERC20 token transfers.
- **Code Reference**: 
  ```solidity
  import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
  ```
- **Reference**: [OpenZeppelin SafeERC20](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#SafeERC20)

### Usage
- **Functions**: `stake`, `unstake`, `claim`, `deploy`
- **Example**: 
  ```solidity
  IERC20(pool.stakeToken).safeTransferFrom(msg.sender, address(this), amount);
  ```

## Access Control

### Description
Access control mechanisms are implemented using the `Ownable` contract from OpenZeppelin to restrict certain functions to the contract owner or admin.

### Implementation
- **Location**: Contract constructors and admin functions.
- **Code Reference**: 
  ```solidity
  import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
  ```
- **Reference**: [OpenZeppelin Ownable](https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable)

### Usage
- **Functions**: `addFactory`, `removeFactory`, `claimFee`
- **Example**: 
  ```solidity
  constructor(address managerContract) GenericFactory(managerContract) Ownable(msg.sender) { ... }
  ```

## Input Validation

### Description
Input validation ensures that all parameters passed to functions are within expected ranges and formats, preventing errors and potential exploits.

### Implementation
- **Location**: Function parameters.
- **Code Reference**: Various checks within functions.
  
### Usage
- **Functions**: `stake`, `unstake`, `claim`, `deploy`
- **Example**: 
  ```solidity
  if (amount == 0) revert InvalidAmount();
  if (poolStartTime < block.timestamp) revert InvalidStartTime();
  ```