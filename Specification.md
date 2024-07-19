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
- 
# Smart Contracts

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

## Function Logic

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