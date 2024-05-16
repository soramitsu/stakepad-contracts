import { expect } from "chai";
import { ethers } from "hardhat";
import {
  time,
} from "@nomicfoundation/hardhat-network-helpers";
import {
  ERC20LockUpPool,
  ERC20MockToken,
  ERC20LockUpStakingFactory,
  ERC20LockUpStakingFactory__factory,
} from "../typechain";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { BigNumberish, BytesLike, parseEther } from "ethers";
import {mint, approve, deployAndSetupPool } from "./helpers";

describe("ERC20LockupPool Standard Scenario", async function () {
    let mockStakeToken: ERC20MockToken;
    let mockRewardToken: ERC20MockToken;
    let rewardTokenPerSecond: BigNumberish;
    let poolStartTime: BigNumberish;
    let poolEndTime: BigNumberish;
    let unstakeLockUp: BigNumberish;
    let claimLockUp: BigNumberish;
    let ipfsHash: BytesLike;
    let signer: HardhatEthersSigner;
    let ayo: HardhatEthersSigner;
    let alina: HardhatEthersSigner;
    let vartan: HardhatEthersSigner;
    let nikita: HardhatEthersSigner;
    let mary: HardhatEthersSigner;
    let mansur: HardhatEthersSigner;
  
  
    beforeEach(async function () {
  
      // Get signers
      [signer, ayo, alina, vartan, signer, nikita, mary, mansur] = await ethers.getSigners();
  
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
  
      ipfsHash = ethers.randomBytes(32);
      rewardTokenPerSecond = ethers.parseEther("1");
      poolStartTime = (await time.latest()) + 100; // Start in 100 seconds
      poolEndTime = poolStartTime + 1000; // End in 1000 seconds after start
      unstakeLockUp = poolStartTime + 500; // Lockup 500 seconds after start
      claimLockUp = poolStartTime + 200; // Lockup 200 seconds after start
      rewardTokenPerSecond = ethers.parseEther("1"); // 1 RWD per second
    });
  
    it("Handles standard staking, unstaking, claiming, and pool ending", async function () {
      // Set pool parameters
      poolStartTime = (await time.latest()) + 100; // Start in 100 seconds
      poolEndTime = poolStartTime + 1000; // End in 1000 seconds after start
      unstakeLockUp = poolStartTime + 500; // Lockup 500 seconds after start
      claimLockUp = poolStartTime + 200; // Lockup 200 seconds after start
      rewardTokenPerSecond = ethers.parseEther("1"); // 1 RWD per second
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime,
        poolEndTime: poolEndTime,
        unstakeLockUpTime: unstakeLockUp,
        claimLockUpTime: claimLockUp,
        rewardPerSecond: rewardTokenPerSecond
      }
      let { poolContract } = await deployAndSetupPool(ipfsHash, ayo, data)
      // **Scenario: Pool Not Started**
      await expect(poolContract.stake(ethers.parseEther("100")))
        .to.be.revertedWithCustomError(poolContract, "PoolNotStarted");
  
      // **Scenario: Pool Started, Staking**
      await time.increase(100); // Advance time to pool start
      await mint(100, alina, mockStakeToken)
      await approve(100, alina, mockStakeToken, await poolContract.getAddress())
      await expect(poolContract.connect(alina).stake(ethers.parseEther("100")))
        .to.emit(poolContract, "Stake")
        .withArgs(alina.address, ethers.parseEther("100"));
  
      // **Scenario: Unstaking**
      await time.increase(500); // Advance to after unstake lockup
      await expect(poolContract.connect(alina).unstake(ethers.parseEther("50")))
        .to.emit(poolContract, "Unstake")
        .withArgs(alina.address, ethers.parseEther("50"));
  
      // **Scenario: Claiming Rewards**
      await time.increase(200); // Advance to after claim lockup
      const initialBalance = await mockRewardToken.balanceOf(alina.address);
      await poolContract.connect(alina).claim();
      const finalBalance = await mockRewardToken.balanceOf(alina.address);
      expect(finalBalance).to.be.gt(initialBalance); // Ensure balance increased
  
      // **Scenario: New User (Vartan) Stakes**
      await mockStakeToken.mint(vartan.address, ethers.parseEther("5000"));
      await mockStakeToken.connect(vartan).approve(poolContract.target, ethers.parseEther("5000"));
      await poolContract.connect(vartan).stake(ethers.parseEther("50"));
      await time.increase(10);
      const vartansFinalRewards = await poolContract.pendingRewards(vartan.address);
      expect(vartansFinalRewards).to.be.gt(0); // Alina should have pending rewards
  
      // **Scenario: Pool Ends**
      await time.increase(490); // Advance to pool end time
      const alinasFinalRewards = await poolContract.pendingRewards(alina.address);
      let alinaFirstClaimBalance = await mockRewardToken.balanceOf(alina.address);
      expect(alinasFinalRewards).to.be.gt(0); // Alina should have final rewards
      await poolContract.connect(alina).claim();
      let alinaBalance = await mockRewardToken.balanceOf(alina.address);
      expect(alinaBalance).to.be.equal(alinaFirstClaimBalance + alinasFinalRewards);
    });
  
  
    it("Handles multiple users staking different amounts, unstaking, and claiming", async function () {
      poolStartTime = (await time.latest()) + 100; // Start in 100 seconds
      poolEndTime = poolStartTime + 1000; // End in 1000 seconds after start
      unstakeLockUp = poolStartTime + 500; // Lockup 500 seconds after start
      claimLockUp = poolStartTime + 200; // Lockup 200 seconds after start
      rewardTokenPerSecond = ethers.parseEther("1"); // 1 RWD per second
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime,
        poolEndTime: poolEndTime,
        unstakeLockUpTime: unstakeLockUp,
        claimLockUpTime: claimLockUp,
        rewardPerSecond: rewardTokenPerSecond
      };
      const { poolContract } = await deployAndSetupPool(ipfsHash, ayo, data);
  
  
      const users = [ayo, alina, vartan, signer, nikita, mary, mansur];
      let poolAddress = await poolContract.getAddress();
      for (const user of users) {
        await mockStakeToken.mint(user, ethers.parseEther("10000000000"));
        await approve(1000000000, user, mockStakeToken, poolAddress)
      }
  
      await time.increaseTo(poolStartTime);
  
      await poolContract.connect(ayo).stake(ethers.parseEther("75"));
      await poolContract.connect(alina).stake(ethers.parseEther("120"));
      await poolContract.connect(vartan).stake(ethers.parseEther("90"));
      await poolContract.connect(signer).stake(ethers.parseEther("115"));
      await poolContract.connect(nikita).stake(ethers.parseEther("85"));
      await poolContract.connect(mary).stake(ethers.parseEther("105"));
  
      await time.increaseTo(unstakeLockUp);
  
      await poolContract.connect(ayo).unstake(ethers.parseEther("30"));
      await poolContract.connect(alina).unstake(ethers.parseEther("40"));
      await poolContract.connect(vartan).unstake(ethers.parseEther("50"));
      await poolContract.connect(signer).unstake(ethers.parseEther("60"));
      await poolContract.connect(nikita).unstake(ethers.parseEther("25"));
      await poolContract.connect(mary).unstake(ethers.parseEther("35"));
  
      const ayoInitialBalance = await mockRewardToken.balanceOf(ayo.address);
      await poolContract.connect(ayo).claim();
      const ayoFinalBalance = await mockRewardToken.balanceOf(ayo.address);
      expect(ayoFinalBalance).to.be.gt(ayoInitialBalance);
  
      const alinaInitialBalance = await mockRewardToken.balanceOf(alina.address);
      await poolContract.connect(alina).claim();
      const alinaFinalBalance = await mockRewardToken.balanceOf(alina.address);
      expect(alinaFinalBalance).to.be.gt(alinaInitialBalance);
  
      const vartanInitialBalance = await mockRewardToken.balanceOf(vartan.address);
      await poolContract.connect(vartan).claim();
      const vartanFinalBalance = await mockRewardToken.balanceOf(vartan.address);
      expect(vartanFinalBalance).to.be.gt(vartanInitialBalance);
  
      const signerInitialBalance = await mockRewardToken.balanceOf(signer.address);
      await poolContract.connect(signer).claim();
      const signerFinalBalance = await mockRewardToken.balanceOf(signer.address);
      expect(signerFinalBalance).to.be.gt(signerInitialBalance);
  
      const nikitaInitialBalance = await mockRewardToken.balanceOf(nikita.address);
      await poolContract.connect(nikita).claim();
      const nikitaFinalBalance = await mockRewardToken.balanceOf(nikita.address);
      expect(nikitaFinalBalance).to.be.gt(nikitaInitialBalance);
  
      const maryInitialBalance = await mockRewardToken.balanceOf(mary.address);
      await poolContract.connect(mary).claim();
      const maryFinalBalance = await mockRewardToken.balanceOf(mary.address);
      expect(maryFinalBalance).to.be.gt(maryInitialBalance);
  
  
      const newStakeAmount = ethers.parseEther("50");
      await mockStakeToken.mint(mansur, newStakeAmount);
      await approve(50, alina, mockStakeToken, await poolContract.getAddress())
      await poolContract.connect(mansur).stake(newStakeAmount);
  
      await time.increaseTo(poolEndTime - 100);
  
      const newUsersRewards = await poolContract.pendingRewards(mansur.address);
      expect(newUsersRewards).to.be.gt(0);
  
      await time.increaseTo(poolEndTime);
  
      const ayoLastBalance = await mockRewardToken.balanceOf(ayo.address);
      await poolContract.connect(ayo).claim();
      const ayoLastFinalBalance = await mockRewardToken.balanceOf(ayo.address);
      expect(ayoLastFinalBalance).to.be.gt(ayoLastBalance);
  
      const alinaLastBalance = await mockRewardToken.balanceOf(alina.address);
      await poolContract.connect(alina).claim();
      const alinaLastFinalBalance = await mockRewardToken.balanceOf(alina.address);
      expect(alinaLastFinalBalance).to.be.gt(alinaLastBalance);
  
      const vartanLastBalance = await mockRewardToken.balanceOf(vartan.address);
      await poolContract.connect(vartan).claim();
      const vartanLastFinalBalance = await mockRewardToken.balanceOf(vartan.address);
      expect(vartanLastFinalBalance).to.be.gt(vartanLastBalance);
  
      const signerLastBalance = await mockRewardToken.balanceOf(signer.address);
      await poolContract.connect(signer).claim();
      const signerLastFinalBalance = await mockRewardToken.balanceOf(signer.address);
      expect(signerLastFinalBalance).to.be.gt(signerLastBalance);
  
      const nikitaLastBalance = await mockRewardToken.balanceOf(nikita.address);
      await poolContract.connect(nikita).claim();
      const nikitaLastFinalBalance = await mockRewardToken.balanceOf(nikita.address);
      expect(nikitaLastFinalBalance).to.be.gt(nikitaLastBalance);
  
      const maryLastBalance = await mockRewardToken.balanceOf(mary.address);
      await poolContract.connect(mary).claim();
      const maryLastFinalBalance = await mockRewardToken.balanceOf(mary.address);
      expect(maryLastFinalBalance).to.be.gt(maryLastBalance);
    });
  
    it("Handles two users with randomized staking, unstaking, and claiming", async function () {
      poolStartTime = (await time.latest()) + 100;
      poolEndTime = poolStartTime + 1000;
      unstakeLockUp = poolStartTime + 500;
      claimLockUp = poolStartTime + 200;
      rewardTokenPerSecond = ethers.parseEther("1");
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime,
        poolEndTime: poolEndTime,
        unstakeLockUpTime: unstakeLockUp,
        claimLockUpTime: claimLockUp,
        rewardPerSecond: rewardTokenPerSecond
      };
      const { poolContract } = await deployAndSetupPool(ipfsHash, ayo, data);
  
      const mintAmount = ethers.parseEther("1000");
      const users = [ayo, alina];
      const poolAddress = await poolContract.getAddress();
  
      await mockStakeToken.mint(ayo, ethers.parseEther("10000000000"));
      await approve(1000000000, ayo, mockStakeToken, poolAddress)
      await mockStakeToken.mint(alina, ethers.parseEther("10000000000"));
      await approve(1000000000, alina, mockStakeToken, poolAddress)
  
      await time.increaseTo(poolStartTime);
      await poolContract.connect(ayo).stake(ethers.parseEther("75"));
  
      await time.increase(100);
  
      await poolContract.connect(alina).stake(ethers.parseEther("120"));
  
      await time.increaseTo(unstakeLockUp);
  
      await poolContract.connect(ayo).unstake(ethers.parseEther("30"));
  
      const ayoInitialBalance = await mockRewardToken.balanceOf(ayo.address);
      await poolContract.connect(ayo).claim();
      const ayoFinalBalance = await mockRewardToken.balanceOf(ayo.address);
      expect(ayoFinalBalance).to.be.gt(ayoInitialBalance);
  
      await poolContract.connect(ayo).stake(ethers.parseEther("20"));
  
      const alinaInitialBalance = await mockRewardToken.balanceOf(alina.address);
      await poolContract.connect(alina).claim();
      const alinaFinalBalance = await mockRewardToken.balanceOf(alina.address);
      expect(alinaFinalBalance).to.be.gt(alinaInitialBalance);
  
      await time.increase(200);
  
      await poolContract.connect(alina).unstake(ethers.parseEther("40"));
  
      const newStakeAmount = ethers.parseEther("50");
      await mockStakeToken.mint(mansur, newStakeAmount);
      await approve(50, mansur, mockStakeToken, poolAddress)
      await poolContract.connect(mansur).stake(newStakeAmount);
  
      await time.increaseTo(poolEndTime - 100);
  
      const newUsersRewards = await poolContract.pendingRewards(mansur.address);
      expect(newUsersRewards).to.be.gt(0);
  
      await time.increaseTo(poolEndTime);
  
      const ayoLastBalance = await mockRewardToken.balanceOf(ayo.address);
      await poolContract.connect(ayo).claim();
      const ayoLastFinalBalance = await mockRewardToken.balanceOf(ayo.address);
      expect(ayoLastFinalBalance).to.be.gt(ayoLastBalance);
  
      const alinaLastBalance = await mockRewardToken.balanceOf(alina.address);
      await poolContract.connect(alina).claim();
      const alinaLastFinalBalance = await mockRewardToken.balanceOf(alina.address);
      expect(alinaLastFinalBalance).to.be.gt(alinaLastBalance);
  
      const mansurLastBalance = await mockRewardToken.balanceOf(mansur.address);
      await poolContract.connect(mansur).claim();
      const mansurLastFinalBalance = await mockRewardToken.balanceOf(mansur.address);
      expect(mansurLastFinalBalance).to.be.gt(mansurLastBalance);
    });
  
  });