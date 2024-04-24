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
import { assert } from "console";

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
  let staking: ERC20LockUpStakingPool;
  let StakingFactory: ERC20LockUpStakingFactory__factory;
  let ercStakingPoolFactory: ERC20LockUpStakingFactory;
  let mockStakeToken: ERC20MockToken;
  let mockRewardToken: ERC20MockToken;
  let currentTime: number;
  let signers: HardhatEthersSigner[];
  let rewardTokenPerSecond: bigint;
  let poolStartTime: number;
  let poolEndTime: number;
  let unstakeLockup: number;
  let claimLockup: number;
  let signer: HardhatEthersSigner;
  let poolContract: ERC20LockUpStakingPool;

  before(async () => {
    StakingFactory = await ethers.getContractFactory(
      "ERC20LockUpStakingFactory"
    );
    ercStakingPoolFactory = await StakingFactory.deploy();
    const currentTime = await latest();
    signers = await ethers.getSigners();
    rewardTokenPerSecond = ethers.parseEther("1");
    poolStartTime = currentTime;
    poolEndTime = currentTime;
    unstakeLockup = currentTime;
    claimLockup = currentTime;
    [signer] = signers;
    const adminAddress = signer.address;

    mockStakeToken = await ethers.deployContract("ERC20MockToken", [
      18,
      "StakeToken",
      "STK",
    ]);
    mockRewardToken = await ethers.deployContract("ERC20MockToken", [
      18,
      "RewardToken",
      "RTK",
    ]);
  });

  describe("ERC20LockUpStakingPool Deployment", async function () {
    it("Deployment fail: start Time less than block time (InvalidStartTime)", async function () {
      await expect(
        ercStakingPoolFactory.deploy(
          mockStakeToken.getAddress(),
          mockRewardToken.getAddress(),
          ethers.parseEther("" + rewardTokenPerSecond),
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
          mockStakeToken.getAddress(),
          mockRewardToken.getAddress(),
          ethers.parseEther("" + rewardTokenPerSecond),
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
          mockStakeToken.getAddress(),
          mockRewardToken.getAddress(),
          ethers.parseEther("" + rewardTokenPerSecond),
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
          mockStakeToken.getAddress(),
          mockRewardToken.getAddress(),
          ethers.parseEther("" + rewardTokenPerSecond),
          poolStartTime + 100,
          poolEndTime + +100 + 10 + 10,
          unstakeLockup + 100 + 10,
          claimLockup + 100 + 10 + 10 + 10
        )
      ).to.be.reverted;
    });

    it("Should be successfully deployed", async function () {
      poolStartTime += 100;
      poolEndTime += +100 + 10 + 10;
      unstakeLockup += 100 + 10;
      claimLockup += 100 + 10;
      let contractTransaction = await ercStakingPoolFactory.deploy(
        mockStakeToken.getAddress(),
        mockRewardToken.getAddress(),
        ethers.parseEther("" + rewardTokenPerSecond),
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
      expect(stakingPool.stakeToken).to.equal(
        await mockStakeToken.getAddress()
      );
      expect(stakingPool.rewardToken).to.equal(
        await mockRewardToken.getAddress()
      );
      expect(stakingPool.startTime).to.equal(poolStartTime);
      expect(stakingPool.endTime).to.equal(poolEndTime);
      expect(stakingPool.unstakeLockupTime).to.equal(unstakeLockup);
      expect(stakingPool.claimLockupTime).to.equal(claimLockup);
      expect(stakingPool.isActive).to.equal(false);
    });
  });

  describe("Pool Interactions", async function () {
    it("Stake fail: (PoolNotStarted)", async function () {
      expect(
        poolContract.stake(ethers.parseEther("100"))
      ).revertedWithCustomError(poolContract, "PoolNotStarted");
    });
    it("Stake fail: (PoolNotActive)", async function () {
      time.increaseTo(poolStartTime);
      poolContract.stake(ethers.parseEther("100")).catch((error: any) => {
        console.log("Error Type:", error.message);
      });
      expect(
        poolContract.stake(ethers.parseEther("100"))
      ).revertedWithCustomError(poolContract, "PoolNotStarted");
    });
    it("Pool: Activate pool", async function () {
      time.increaseTo(poolStartTime);
      await poolContract.connect(signer).activate();
      expect((await poolContract.pool()).isActive).to.equal(true);
    });
    it("Stake fail: (InsufficientAmount)", async function () {
      time.increaseTo(poolStartTime);
      let amount = ethers.parseEther("0");
      poolContract.stake(ethers.parseEther("0")).catch((error: any) => {
        console.log("Error Type:", error.message);
      });
      expect(
        poolContract.stake(amount).catch((error: any) => {
          console.log("Error Type:", error.message);
        })
      ).revertedWithCustomError(poolContract, "InsufficientAmount");
    });
    it("Stake: Expect total staked to increase", async function () {
      let amount = ethers.parseEther("10");
      let stakingPool = await poolContract.pool();
      poolContract.stake(amount);
      expect(stakingPool.totalStaked).to.equal(amount);
    });
  });
});
