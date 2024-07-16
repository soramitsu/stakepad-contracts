
# Stake Pad Project Specification Document

## 1. Introduction

### 1.1 Project Overview
**Brief description of Stake Pad**  
Stake Pad is a Web3 staking pool platform designed to facilitate decentralized staking for both ERC20 and ERC721 tokens. It allows users to earn rewards by staking their tokens in various pools, each with its own set of rules and rewards structure. Stake Pad supports different types of staking mechanisms, including lock-up periods and penalty fees for early unstaking.

**Core features and functionalities**
- **ERC20 and ERC721 Staking Pools**: Supports staking for both fungible (ERC20) and non-fungible tokens (ERC721).
- **Lock-Up Mechanisms**: Pools with specific lock-up periods where staked tokens cannot be withdrawn until the period ends.
- **Penalty Fees**: Pools that charge a penalty fee for early unstaking.
- **Reward Distribution**: Automatic reward distribution based on staking duration and amount.
- **Factory Contracts**: Factory contracts for deploying staking pools with customizable parameters.
- **Request Management**: A request management system for creating and approving staking pool deployments.

### 1.2 Purpose and Scope
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

### 1.3 Terminology and Definitions
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

# 3. Smart Contracts

## 3.1 Management Contracts

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

## 3.2 Factory Contracts

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

## 3.3 Main Contracts

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

## 3.4 ERC721 Contracts

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
