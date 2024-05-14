import { expect } from "chai";
import { ethers } from "hardhat";
import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-network-helpers";
import {
  ERC20LockUpPool,
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
  unstakeLockUp: number;
  claimLockUp: number;
  adminAddress: string;
  stakeToken: string;
  rewardToken: string;
}
let PRECISION_FACTOR = BigInt(10e18);

describe("Contract Deployment", async function () {
  let StakingFactory: ERC20LockUpStakingFactory__factory;
  let ercStakingPoolFactory: ERC20LockUpStakingFactory;
  let mockStakeToken: ERC20MockToken;
  let mockRewardToken: ERC20MockToken;
  let rewardTokenPerSecond: bigint;
  let poolStartTime: number;
  let poolEndTime: number;
  let unstakeLockUp: number;
  let claimLockUp: number;
  let signer: HardhatEthersSigner;
  let ayo: HardhatEthersSigner;
  let alina: HardhatEthersSigner;
  let vartan: HardhatEthersSigner;
  let poolContract: ERC20LockUpPool;

  before(async () => {
    StakingFactory = await ethers.getContractFactory(
      "ERC20LockUpStakingFactory"
    );
    ercStakingPoolFactory = await StakingFactory.deploy();
    const blockTimestamp = await time.latest();
    rewardTokenPerSecond = ethers.parseEther("1");
    poolStartTime = blockTimestamp;
    poolEndTime = blockTimestamp;
    unstakeLockUp = blockTimestamp;
    claimLockUp = blockTimestamp;
    [signer, ayo, alina, vartan] = await ethers.getSigners();

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
    //First mint reward tokens for user before activating pool
    await mockStakeToken.mint(
      signer.address,
      ethers.parseEther("2000000000")
    );
    await mockRewardToken.mint(
      ayo.address,
      ethers.parseEther("2000000000")
    );
  });

  describe("ERC20LockUpStakingPool Deployment", async function () {
    it("Request creation failed: invalid staking token address", async function () {
      poolStartTime += 100;
      poolEndTime = poolStartTime + 120;
      unstakeLockUp = poolStartTime + 10;
      claimLockUp = poolStartTime + 10;
      const data = {
        stakeToken: ethers.ZeroAddress,
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime,
        poolEndTime: poolEndTime,
        unstakeLockUpTime: unstakeLockUp,
        claimLockUpTime: claimLockUp,
        rewardPerSecond: rewardTokenPerSecond
      }
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.connect(ayo).requestDeployment(data)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidTokenAddress");
      let length = (await ercStakingPoolFactory.getRequests()).length;
      expect(lengthBefore).to.be.equal(length);
    });

    it("Request creation failed: invalid reward token addresses", async function () {
      poolStartTime += 100;
      poolEndTime = poolStartTime + 120;
      unstakeLockUp = poolStartTime + 10;
      claimLockUp = poolStartTime + 10;
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: ethers.ZeroAddress,
        poolStartTime: poolStartTime,
        poolEndTime: poolEndTime,
        unstakeLockUpTime: unstakeLockUp,
        claimLockUpTime: claimLockUp,
        rewardPerSecond: rewardTokenPerSecond
      }
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.connect(ayo).requestDeployment(data)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidTokenAddress");
      let length = (await ercStakingPoolFactory.getRequests()).length;
      expect(lengthBefore).to.be.equal(length);
    });

    it("Request creation failed: invalid reward token addresses", async function () {
      poolStartTime += 100;
      poolEndTime = poolStartTime + 120;
      unstakeLockUp = poolStartTime + 10;
      claimLockUp = poolStartTime + 10;
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime,
        poolEndTime: poolEndTime,
        unstakeLockUpTime: unstakeLockUp,
        claimLockUpTime: claimLockUp,
        rewardPerSecond: ethers.toBigInt(0)
      }
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.connect(ayo).requestDeployment(data)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidRewardRate");
      let length = (await ercStakingPoolFactory.getRequests()).length;
      expect(lengthBefore).to.be.equal(length);
    });

    it("Request should be successfully created", async function () {
      poolStartTime += 100;
      poolEndTime = poolStartTime + 120;
      unstakeLockUp = poolStartTime + 10;
      claimLockUp = poolStartTime + 10;
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime,
        poolEndTime: poolEndTime,
        unstakeLockUpTime: unstakeLockUp,
        claimLockUpTime: claimLockUp,
        rewardPerSecond: rewardTokenPerSecond
      }
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(ercStakingPoolFactory.connect(ayo).requestDeployment(data)).to.emit(ercStakingPoolFactory, "RequestSubmitted").withArgs(length, ayo.address, 1, values);
      length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(length).to.be.equal(1);
      expect(req.requestStatus).to.be.equal(1);
      expect(req.deployer).to.be.equal(ayo.address);
      expect(req.data).to.be.deep.equal(values);
    });

    it("Request approval failed: invalid caller", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.connect(ayo).approveRequest(length - 1)).to.be.revertedWithCustomError(ercStakingPoolFactory, "OwnableUnauthorizedAccount");
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.requestStatus).to.be.equal(1);
    });

    it("Should correctly approve request deployment", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      await ercStakingPoolFactory.approveRequest(length - 1);
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.requestStatus).to.be.equal(3);
    });

    it("Request approval failed: already approved", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.approveRequest(length - 1)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidRequestStatus");
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.requestStatus).to.be.equal(3);
    });

    it("Should correctly deploy pool from APPROVED request", async function () {
      await mockRewardToken
        .connect(ayo)
        .approve(
          await ercStakingPoolFactory.getAddress(),
          parseEther("2000000000")
        );
      let length = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.connect(ayo).deploy(length - 1)).to.emit(ercStakingPoolFactory, "StakingPoolDeployed");
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.requestStatus).to.be.equal(4);
      let poolsLength = (await ercStakingPoolFactory.getPools()).length;
      let lastPool = await ercStakingPoolFactory.stakingPools(poolsLength - 1);
      poolContract = await ethers.getContractAt(
        "ERC20LockUpPool",
        lastPool
      );
    });

    it("Request approval failed: already deployed", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.approveRequest(length - 1)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidRequestStatus");
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.requestStatus).to.be.equal(4);
    });

    it("Another requests created with wrong start time", async function () {
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime - 10000,
        poolEndTime: poolStartTime + 120,
        unstakeLockUpTime: poolStartTime + 10,
        claimLockUpTime: poolStartTime + 10,
        rewardPerSecond: rewardTokenPerSecond,
      };
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(ercStakingPoolFactory.connect(ayo).requestDeployment(data)).to.emit(ercStakingPoolFactory, "RequestSubmitted").withArgs(lengthBefore, ayo.address, 1, values);
      let length = (await ercStakingPoolFactory.getRequests()).length;
      expect(length).to.be.equal(lengthBefore + 1);
      
      await ercStakingPoolFactory.approveRequest(length - 1);
      await expect(ercStakingPoolFactory.connect(ayo).deploy(length - 1)).to.be.revertedWithCustomError(poolContract, "InvalidStartTime");
      let req = await ercStakingPoolFactory.requests(lengthBefore);
      expect(req.requestStatus).to.be.equal(3);
    });

    it("Another requests created with wrong staking period", async function () {
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime + 10000,
        poolEndTime: poolStartTime + 120,
        unstakeLockUpTime: poolStartTime + 10,
        claimLockUpTime: poolStartTime + 10,
        rewardPerSecond: rewardTokenPerSecond
      };
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(ercStakingPoolFactory.connect(ayo).requestDeployment(data)).to.emit(ercStakingPoolFactory, "RequestSubmitted").withArgs(lengthBefore, ayo.address, 1, values);
      let length = (await ercStakingPoolFactory.getRequests()).length;
      
      expect(length).to.be.equal(lengthBefore + 1);
    
      await ercStakingPoolFactory.approveRequest(lengthBefore);
      await expect(ercStakingPoolFactory.connect(ayo).deploy(lengthBefore)).to.be.revertedWithCustomError(poolContract, "InvalidStakingPeriod");
      let req = await ercStakingPoolFactory.requests(lengthBefore);
      expect(req.requestStatus).to.be.equal(3);
    });

    it("Another requests created with wrong unstake LockUp time", async function () {
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime + 100,
        poolEndTime: poolStartTime + 120,
        unstakeLockUpTime: poolEndTime + 130,
        claimLockUpTime: poolStartTime + 10,
        rewardPerSecond: rewardTokenPerSecond,
      };
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(ercStakingPoolFactory.connect(ayo).requestDeployment(data)).to.emit(ercStakingPoolFactory, "RequestSubmitted").withArgs(lengthBefore, ayo.address, 1, values);
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(lengthBefore);
      expect(length).to.be.equal(lengthBefore + 1);
      expect(req.requestStatus).to.be.equal(1);
      await ercStakingPoolFactory.approveRequest(length - 1);
      await expect(ercStakingPoolFactory.connect(ayo).deploy(lengthBefore)).to.be.revertedWithCustomError(poolContract, "InvalidLockUpTime");
    });

    it("Another requests created with wrong claim LockUp time", async function () {
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime + 100,
        poolEndTime: poolStartTime + 120,
        unstakeLockUpTime: poolStartTime + 10,
        claimLockUpTime: poolEndTime + 10,
        rewardPerSecond: rewardTokenPerSecond
      };
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(ercStakingPoolFactory.connect(ayo).requestDeployment(data)).to.emit(ercStakingPoolFactory, "RequestSubmitted").withArgs(lengthBefore, ayo.address, 1, values);
      await ercStakingPoolFactory.approveRequest(lengthBefore);
      await expect(ercStakingPoolFactory.connect(ayo).deploy(lengthBefore)).to.be.revertedWithCustomError(poolContract, "InvalidLockUpTime");
    });

    it("Cancel last approved request failed: caller is not an owner", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.requestStatus).to.be.equal(3);
      await expect(ercStakingPoolFactory.cancelRequest(length - 1)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidCaller");
    });

    it("Cancel last approved request", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.requestStatus).to.be.equal(3);
      await expect(ercStakingPoolFactory.connect(ayo).cancelRequest(length - 1)).to.be.emit(ercStakingPoolFactory, "RequestStatusChanged");
      req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.requestStatus).to.be.equal(5);
    });

    it("Cancel last approved request failed: already canceled", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.requestStatus).to.be.equal(5);
      await expect(ercStakingPoolFactory.connect(ayo).cancelRequest(length - 1)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidRequestStatus");
    });
  })
  describe("Pool Interactions", async function () {
    it("Stake fail: (PoolNotStarted)", async function () {
      await expect(
        poolContract.stake(ethers.parseEther("100"))
      ).revertedWithCustomError(poolContract, "PoolNotStarted");
    });

    it("Stake fail: (InvalidAmount)", async function () {
      await time.increaseTo(poolStartTime);
      let amount = ethers.parseEther("0");
      await expect(poolContract.stake(amount)).revertedWithCustomError(
        poolContract,
        "InvalidAmount"
      );
    });

    it("Stake: Expect Emit (Stake)", async function () {
      //First transfer stake tokens for user
      await mockStakeToken.transfer(
        ayo.address,
        ethers.parseEther("10000")
      );
      //Approve user to transfer tokens
      await mockStakeToken
        .connect(ayo)
        .approve(
          poolContract.target,
          ethers.parseEther("10000")
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
      expect((await poolContract.pool()).totalStaked).to.equal(amount + amount);
    });

    it("UnStake: Expect Unstake Emit", async function () {
      let amount = ethers.parseEther("50");
      await expect(
        poolContract.connect(ayo).unstake(amount)
      ).emit(poolContract, "Unstake").withArgs(ayo.address, amount);
    });

    it("Unstake: Expect Total Staked to equal stake token balance", async function () {
      let amount = ethers.parseEther("50");

      let balance = await mockStakeToken.balanceOf(poolContract.target)
      let totalStaked = (await poolContract.pool()).totalStaked
      await expect(poolContract.connect(ayo).unstake(amount)).emit(poolContract, "Unstake");
      balance = await mockStakeToken.balanceOf(poolContract.target)
      totalStaked = (await poolContract.pool()).totalStaked
      expect((await poolContract.pool()).totalStaked).to.equal(amount + amount);
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

    it("New user stakes", async function () {
      let initialTotalStaked = (await poolContract.pool()).totalStaked
      await mockStakeToken.transfer(alina.address, ethers.parseEther("10000"))
      await mockStakeToken.connect(alina).approve(poolContract.target, ethers.parseEther("10000"))
      await expect(poolContract.connect(alina).stake(ethers.parseEther("100"))).emit(poolContract, "Stake")
      expect((await poolContract.pool()).totalStaked).to.be.greaterThan(initialTotalStaked)
    });

    it("Attempt to unstake more than staked", async function () {
      await expect(poolContract.connect(alina).unstake(ethers.parseEther("10000"))).revertedWithCustomError(poolContract, "InsufficientAmount")
      //await time.increase(5)
    });
    it("Should correctly calculate rewards and match pendingRewards()", async function () {

      // Calculate rewards outside the contract (emulating pendingRewards logic)
      let ayoUser = await poolContract.userInfo(ayo.address);
      const currentTimestamp = await time.latest();

      const pendingRewards = await poolContract.pendingRewards(ayo.address);
      let accRewardPerShare = (await poolContract.pool()).accRewardPerShare;

      let stakingPool = await poolContract.pool()
      if (currentTimestamp > stakingPool.lastUpdateTimestamp && stakingPool.totalStaked !== BigInt(0)) {
        const elapsedPeriod = BigInt(currentTimestamp) - stakingPool.lastUpdateTimestamp;
        const totalNewReward = stakingPool.rewardTokenPerSecond * elapsedPeriod;
        accRewardPerShare += (totalNewReward * PRECISION_FACTOR) / stakingPool.totalStaked;
      }

      const calculatedRewards = ((ayoUser.amount * accRewardPerShare) / PRECISION_FACTOR) - ayoUser.rewardDebt;
      // Compare with the output of pendingRewards()
      console.log("Calculated rewards: " + calculatedRewards, "Pending Rewards: " + pendingRewards)
      expect(calculatedRewards).to.be.closeTo(pendingRewards, ethers.parseEther("0.1")); // Adjust if needed
    });
    it("Another New user stakes", async function () {
      let initialTotalStaked = (await poolContract.pool()).totalStaked
      await mockStakeToken.transfer(vartan.address, ethers.parseEther("10000"))
      await mockStakeToken.connect(vartan).approve(poolContract.target, ethers.parseEther("10000"))
      await expect(poolContract.connect(vartan).stake(ethers.parseEther("100"))).emit(poolContract, "Stake")
      expect((await poolContract.pool()).totalStaked).to.be.greaterThan(initialTotalStaked)
    });
    it("Claim: User 2 reward token amount should increase by amount claimed", async function () {
      await time.increase(5)
      let initialBalance = await mockRewardToken.balanceOf(alina.address)
      await expect(poolContract.connect(alina).claim()).emit(poolContract, "Claim");
      let newBalance = await mockRewardToken.balanceOf(alina.address)
      expect(newBalance).to.be.greaterThan(initialBalance)
    });
    it("Rewards should stop increasing after end pool time", async function () {
      await time.increaseTo(poolEndTime + 1)
      await expect(poolContract.connect(alina).claim()).emit(poolContract, "Claim");
      await time.increase(100)
      let pendingRewards = await poolContract.pendingRewards(alina.address);
      expect(pendingRewards).to.be.equal(0)
    });
  });

  interface StakingPool {
    stakeToken: string;
    rewardToken: string;
    startTime: bigint;
    endTime: bigint;
    unstakeLockUpTime: bigint;
    claimLockUpTime: bigint;
    rewardTokenPerSecond: bigint;
    totalStaked: bigint;
    totalClaimed: bigint;
    lastUpdateTimestamp: bigint;
    accRewardPerShare: bigint;
    isActive: boolean;
    adminWallet: string;
  }
})