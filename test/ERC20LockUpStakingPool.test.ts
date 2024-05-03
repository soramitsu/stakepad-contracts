import { expect } from "chai";
import { ethers } from "hardhat";
import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { latest } from "@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time";
import {
  ERC20LockUpStakingPool,
  ERC20MockToken,
  ERC20LockUpStakingFactory,
  ERC20LockUpStakingFactory__factory,
} from "../typechain";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { parseEther } from "ethers";

interface DeploymentParams {
  currentTime: number;
  rewardTokenPerSecond: bigint;
  poolStartTime: number;
  poolEndTime: number;
  unstakeLockup: number;
  claimLockup: number;
  adminAddress: string;
  stakeToken: string;
  rewardToken: string;
}
class User { 
  amount: bigint;
  rewardDebt: bigint;
  pending: bigint;
  claimed: bigint;

  constructor() {
    this.amount = ethers.parseEther("0");
    this.rewardDebt = ethers.parseEther("0");
    this.pending = ethers.parseEther("0");
    this.claimed = ethers.parseEther("0");
  }
}
let userDetails : Record<string, User> = {}
let PRECISION_FACTOR = BigInt(10e18);
const standardParams = async function () {
  const currentTime = await latest();
  const signers = await ethers.getSigners();
  const rewardTokenPerSecond = ethers.parseEther("1");
  const poolStartTime = currentTime;
  const poolEndTime = currentTime + 24 * 60 * 60 * 30;
  const unstakeLockup = currentTime + 24 * 60 * 60;
  const claimLockup = currentTime + 10 * 60;
  const [signer] = signers;
  const adminAddress = signer.address;
  const stakeToken = ethers.getAddress(process.env.SampleAddress as string);
  const rewardToken = ethers.getAddress(process.env.SampleAddress as string);
  return {
    adminAddress,
    signers,
    currentTime,
    poolStartTime,
    poolEndTime,
    unstakeLockup,
    claimLockup,
    rewardTokenPerSecond,
    stakeToken,
    rewardToken,
  };
};

describe("Contract Deployment", async function () {
  let StakingFactory: ERC20LockUpStakingFactory__factory;
  let ercStakingPoolFactory: ERC20LockUpStakingFactory;
  let mockStakeToken: ERC20MockToken;
  let mockRewardToken: ERC20MockToken;
  let signers: HardhatEthersSigner[];
  let rewardTokenPerSecond: bigint;
  let poolStartTime: number;
  let poolEndTime: number;
  let unstakeLockup: number;
  let claimLockup: number;
  let signer: HardhatEthersSigner;
  let ayo: HardhatEthersSigner;
  let alina: HardhatEthersSigner;
  let vartan: HardhatEthersSigner;
  let poolContract: ERC20LockUpStakingPool;

  before(async () => {
    StakingFactory = await ethers.getContractFactory(
      "ERC20LockUpStakingFactory"
    );
    ercStakingPoolFactory = await StakingFactory.deploy();
    const blockTimestamp = await time.latest();
    signers = await ethers.getSigners();
    rewardTokenPerSecond = ethers.parseEther("1");
    poolStartTime = blockTimestamp;
    poolEndTime = blockTimestamp;
    unstakeLockup = blockTimestamp;
    claimLockup = blockTimestamp;
    [signer, ayo, alina, vartan] = signers;
    const adminAddress = signer.address;

    mockStakeToken = await ethers.deployContract("ERC20MockToken", [
      "StakeToken",
      "STK",
      18
    ]);

    mockRewardToken = await ethers.deployContract("ERC20MockToken", [
      "RewardToken",
      "RTK",
      18
    ]);
  });

  describe("ERC20LockUpStakingPool Deployment", async function () {
    it("Deployment fail: start Time less than block time (InvalidStartTime)", async function () {
      await expect(
        ercStakingPoolFactory.deploy(
          await mockStakeToken.getAddress(),
          await mockRewardToken.getAddress(),
          rewardTokenPerSecond,
          poolStartTime,
          poolEndTime + 24 * 60 * 60 * 30,
          unstakeLockup + 24 * 60 * 60,
          claimLockup + 10 * 60
        )
      ).to.be.reverted;
    });

    it("Deployment fail: end Time less than start time (InvalidStakingPeriod)", async function () {
      await expect(
        ercStakingPoolFactory.deploy(
          await mockStakeToken.getAddress(),
          await mockRewardToken.getAddress(),
          rewardTokenPerSecond,
          poolStartTime + 100,
          poolEndTime,
          unstakeLockup + 100 + 100,
          claimLockup + 100 + 100
        )
      ).to.be.reverted;
    });
    it("Deployment fail: end Time less than unstake lockup time (InvalidLockupTime)", async function () {
      await expect(
        ercStakingPoolFactory.deploy(
          await mockStakeToken.getAddress(),
          await mockRewardToken.getAddress(),
          rewardTokenPerSecond,
          poolStartTime + 100,
          poolEndTime + +100 + 10,
          unstakeLockup + 100 + 10 + 10,
          claimLockup + 100 + 10
        )
      ).to.be.reverted;
    });
    it("Deployment fail: end Time less than claim lockup time (InvalidLockupTime)", async function () {
      await expect(
        ercStakingPoolFactory.deploy(
          await mockStakeToken.getAddress(),
          await mockRewardToken.getAddress(),
          rewardTokenPerSecond,
          poolStartTime + 100,
          poolEndTime + +100 + 10 + 10,
          unstakeLockup + 100 + 10,
          claimLockup + 100 + 10 + 10 + 10
        )
      ).to.be.reverted;
    });

    it("Should be successfully deployed", async function () {
      poolStartTime += 100;
      poolEndTime = poolStartTime + 120;
      unstakeLockup = poolStartTime + 10;
      claimLockup = poolStartTime + 10;
      let contractTransaction = await ercStakingPoolFactory.deploy(
        await mockStakeToken.getAddress(),
        await mockRewardToken.getAddress(),
        rewardTokenPerSecond,
        poolStartTime,
        poolEndTime,
        unstakeLockup,
        claimLockup
      );
      const receipt = await contractTransaction.wait();
      poolContract = await ethers.getContractAt(
        "ERC20LockUpStakingPool",
        receipt?.logs[0].address as string
      );
      expect(poolContract.target).to.be.a.properAddress;
    });

    it("Should correctly set contract parameters", async function () {
      let stakingPool = await poolContract.pool();
      expect(stakingPool.baseInfo.stakeToken).to.equal(
        await mockStakeToken.getAddress()
      );
      expect(stakingPool.baseInfo.rewardToken).to.equal(
        await mockRewardToken.getAddress()
      );
      expect(stakingPool.baseInfo.startTime).to.equal(poolStartTime);
      expect(stakingPool.baseInfo.endTime).to.equal(poolEndTime);
      expect(stakingPool.unstakeLockupTime).to.equal(unstakeLockup);
      expect(stakingPool.claimLockupTime).to.equal(claimLockup);
      expect(stakingPool.baseInfo.isActive).to.equal(false);
    });
  });

  describe("Pool Interactions", async function () {
    it("Stake fail: (PoolNotStarted)", async function () {
      await expect(
        poolContract.stake(ethers.parseEther("100"))
      ).revertedWithCustomError(poolContract, "PoolNotStarted");
    });
    it("Stake fail: (PoolNotActive)", async function () {
      await time.increaseTo(poolStartTime);
      await expect(
        poolContract.stake(ethers.parseEther("500"))
      ).revertedWithCustomError(poolContract, "PoolNotActive");
    });

    it("Pool: Activate pool", async function () {
      //First mint reward tokens for user before activating pool
      await mockRewardToken.mint(
        signer.address,
        ethers.parseEther("2000000000")
      );
      //Approve user inorder to transfer tokens to pool
      await mockRewardToken
        .connect(signer)
        .approve(
          poolContract.target,
          parseEther("2000000000")
        );
      await poolContract.connect(signer).activate();
      expect((await poolContract.pool()).baseInfo.isActive).to.equal(true);
    });

    it("Stake fail: (InvalidAmount)", async function () {
      let amount = ethers.parseEther("0");
      await expect(poolContract.stake(amount)).revertedWithCustomError(
        poolContract,
        "InvalidAmount"
      );
    });

    it("Stake: Expect Emit (Stake)", async function () {
      //First mint stake tokens for user
      await mockStakeToken.mint(
        ayo.address,
        ethers.parseEther("10000000000000000000000")
      );
      //Approve user to transfer tokens
      await mockStakeToken
        .connect(ayo)
        .approve(
          poolContract.target,
          parseEther("10000000000000000000000")
        );

      //Stake
      let amount = ethers.parseEther("100");
      
      await expect(poolContract.connect(ayo).stake(amount)).emit(
        poolContract,
        "Stake"
      ).withArgs(ayo.address, amount);
      await time.increase(5);
    });

    it("Stake: Expect total staked to increase", async function () {
      let amount = ethers.parseEther("100");
      await poolContract.connect(ayo).stake(amount);
      expect((await poolContract.pool()).baseInfo.totalStaked).to.equal(amount + amount);
    });

    it("UnStake: Expect Unstake Emit", async function () {
      let amount = ethers.parseEther("50");
      await expect(
        poolContract.connect(ayo).unstake(amount)
      ).emit(poolContract, "Unstake").withArgs(ayo.address, amount);
    });

    it("UnStake: Expect Total Staked to equal stake token balance", async function () {
      let amount = ethers.parseEther("50");

      let balance = await mockStakeToken.balanceOf(poolContract.target)
      let totalStaked = (await poolContract.pool()).baseInfo.totalStaked
      await expect(poolContract.connect(ayo).unstake(amount)).emit(poolContract, "Unstake");
      balance = await mockStakeToken.balanceOf(poolContract.target)
      totalStaked = (await poolContract.pool()).baseInfo.totalStaked
      expect((await poolContract.pool()).baseInfo.totalStaked).to.equal(amount + amount);
    });

    it("Pending Rewards", async function () {
      let pendingRewards = await poolContract.pendingRewards(ayo.address)
      console.log("Current Time:", await time.latest());
      expect(pendingRewards).to.be.greaterThan(0)
    })

    it("Claim Rewards: Reward Token balance should increase by amount claimed", async function () {
      let initialBalance = await mockRewardToken.balanceOf(ayo.address)
      await expect(poolContract.connect(ayo).claim()).emit(poolContract, "Claim");
      let newBalance = await mockRewardToken.balanceOf(ayo.address)
      expect(newBalance).to.be.greaterThan(initialBalance)
    })

    it("New user stakes" , async function () {
      let initialTotalStaked = (await poolContract.pool()).baseInfo.totalStaked
      await mockStakeToken.mint(alina.address, ethers.parseEther("10000"))
      await mockStakeToken.connect(alina).approve(poolContract.target, ethers.parseEther("10000"))
      await expect(poolContract.connect(alina).stake(ethers.parseEther("100"))).emit(poolContract, "Stake")
      expect((await poolContract.pool()).baseInfo.totalStaked).to.be.greaterThan(initialTotalStaked)
    });
    
    it("Attempt to unstake more than staked" , async function () {
      await expect(poolContract.connect(alina).unstake(ethers.parseEther("10000"))).revertedWithCustomError(poolContract, "InsufficientAmount")
      //await time.increase(5)
    });
    it("Should correctly calculate rewards and match pendingRewards()", async function () {
  
      // Calculate rewards outside the contract (emulating pendingRewards logic)
      let ayoUser = await poolContract.userInfo(ayo.address);
      const currentTimestamp = await time.latest();
  
      const pendingRewards = await poolContract.pendingRewards(ayo.address);
      let accRewardPerShare = (await poolContract.pool()).baseInfo.accRewardPerShare;
      
      let stakingPool = await poolContract.pool()
      if (currentTimestamp > stakingPool.baseInfo.lastRewardTimestamp && stakingPool.baseInfo.totalStaked !== BigInt(0)) {
        const elapsedPeriod = BigInt(currentTimestamp) - stakingPool.baseInfo.lastRewardTimestamp;
        const totalNewReward =  stakingPool.baseInfo.rewardTokenPerSecond * elapsedPeriod;
        accRewardPerShare += (totalNewReward * PRECISION_FACTOR) / stakingPool.baseInfo.totalStaked;
      }
    
      const calculatedRewards = ((ayoUser.amount * accRewardPerShare) / PRECISION_FACTOR) - ayoUser.rewardDebt;
      // Compare with the output of pendingRewards()
      console.log("Calculated rewards: "+ calculatedRewards, "Pending Rewards: "+ pendingRewards)
      expect(calculatedRewards).to.be.closeTo(pendingRewards, ethers.parseEther("0.1")); // Adjust if needed
    });
    it("Another New user stakes" , async function () {
      let initialTotalStaked = (await poolContract.pool()).baseInfo.totalStaked
      await mockStakeToken.mint(vartan.address, ethers.parseEther("10000"))
      await mockStakeToken.connect(vartan).approve(poolContract.target, ethers.parseEther("10000"))
      await expect(poolContract.connect(vartan).stake(ethers.parseEther("100"))).emit(poolContract, "Stake")
      expect((await poolContract.pool()).baseInfo.totalStaked).to.be.greaterThan(initialTotalStaked)
    });
    it("Claim: User 2 reward token amount should increase by amount claimed" , async function () {
      await time.increase(5)
      let initialBalance = await mockRewardToken.balanceOf(alina.address)
      await expect(poolContract.connect(alina).claim()).emit(poolContract, "Claim");
      let newBalance = await mockRewardToken.balanceOf(alina.address)
      expect(newBalance).to.be.greaterThan(initialBalance)
    });
    it("Rewards should stop increasing after end pool time" , async function () {
      await time.increaseTo(poolEndTime + 1)
      await expect(poolContract.connect(alina).claim()).emit(poolContract, "Claim");
      await time.increase(100)
      let pendingRewards = await poolContract.pendingRewards(alina.address);
      expect(pendingRewards).to.be.equal(0)
    });
});
})

interface StakingPool {
    stakeToken: string;
    rewardToken: string;
    startTime: bigint;
    endTime: bigint;
    unstakeLockupTime: bigint;
    claimLockupTime: bigint;
    rewardTokenPerSecond: bigint;
    totalStaked: bigint;
    totalClaimed: bigint;
    lastRewardTimestamp: bigint;
    accRewardPerShare: bigint;
    isActive: boolean;
    adminWallet: string;
  }
// TODO REMOVE THIS PART 
// async function Stake(inputUser: HardhatEthersSigner, amount: bigint, pool: StakingPool) {
//   const user = userDetails[inputUser.address];
//   updateRewardPerShare(pool)
//   user.amount += amount;
//   totalStaked += amount;


//   const accRewardPerShare = await pool.accRewardPerShare;
//   user.rewardDebt = (user.amount * accRewardPerShare) / PRECISION_FACTOR;
//   rewardPerShare
//   rewardPerShare
// }

// async function UnStake(inputUser: HardhatEthersSigner, amount: bigint, pool: StakingPool) {
//   const user = userDetails[inputUser.address];
//   updateRewardPerShare(pool)
//   user.amount -= amount;
//   totalStaked -= amount;

//   // Update reward debt
//   rewardPerShare
//   const accRewardPerShare = await pool.accRewardPerShare;
//   user.rewardDebt = (user.amount * accRewardPerShare) / PRECISION_FACTOR;
// }

// async function Claim(inputUser: HardhatEthersSigner, amount: bigint, pool: StakingPool) {
//   const user = userDetails[inputUser.address];
  
//   user.claimed += amount;
//   user.pending = ethers.parseEther("0");

//   // Update reward debt
//   const accRewardPerShare = pool.accRewardPerShare 
//   user.rewardDebt = (user.amount * accRewardPerShare) / PRECISION_FACTOR;
// }

// let rewardPerShare: bigint
// let lastUpdateTime: bigint
// let totalStaked: bigint
// async function updateRewardPerShare(pool:StakingPool){
//   let elapsedPeriod = _getMultiplier(lastUpdateTime, BigInt(await time.latest()), pool)
//   rewardPerShare +=
//                     (pool.rewardTokenPerSecond *
//                         PRECISION_FACTOR *
//                         elapsedPeriod) /
//                     pool.totalStaked;
//   pool.accRewardPerShare
//   pool.lastRewardTimestamp
//   lastUpdateTime = BigInt(await time.latest())
//   lastUpdateTime
//   }
  
//   function _getMultiplier( _from:bigint, _to:bigint, pool: StakingPool): bigint{
//     if (_to <= pool.endTime) {
//         return _to - _from;
//     } else if (_from >= pool.endTime) {
//         return BigInt(0);
//     } else {
//         return pool.endTime - _from;
//     }
// }