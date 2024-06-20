import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  ERC20LockUpPool,
  ERC20MockToken,
  ERC20LockUpStakingFactory,
  ERC20LockUpStakingFactory__factory,
} from "../../typechain";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { BigNumberish, BytesLike, parseEther } from "ethers";
import { mint, approve, deployAndSetupPool } from "../helpers";
import { increaseTo } from "@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time";

describe("ERC20LockupPool Standard Scenario", async function () {
    let mockStakeToken: ERC20MockToken;
    let mockRewardToken: ERC20MockToken;
    let rewardTokenPerSecond: BigNumberish;
    let poolStartTime: BigNumberish;
    let poolEndTime: BigNumberish;
    let unstakeLockUp: BigNumberish;
    let claimLockUp: BigNumberish;
    let ipfsHash: BytesLike;
    let admin: HardhatEthersSigner;
    let deployer: HardhatEthersSigner;
    let signer: HardhatEthersSigner;
    let userA: HardhatEthersSigner;
    let userB: HardhatEthersSigner;
    let userC: HardhatEthersSigner;
    let nikita: HardhatEthersSigner;
    let mary: HardhatEthersSigner;
    let mansur: HardhatEthersSigner;
  
    beforeEach(async function () {
      // Get signers
      [admin, deployer, userA, userB, userC, signer, nikita, mary, mansur] =
        await ethers.getSigners();
  
      mockStakeToken = await ethers.deployContract("ERC20MockToken", [
        "StakeToken",
        "STK",
        18,
      ]);
  
      mockRewardToken = await ethers.deployContract("ERC20MockToken", [
        "RewardToken",
        "RTK",
        18,
      ]);
      //First mint reward tokens for user before activating pool
      await mockStakeToken.mint(
        admin.address,
        ethers.parseEther("2000000000000000000")
      );
      await mockRewardToken.mint(
        admin.address,
        ethers.parseEther("200000000000000000")
      );
      await approve(1000000000, admin, mockStakeToken, userA.address);
      await approve(1000000000, admin, mockStakeToken, userB.address);
      await approve(1000000000, admin, mockStakeToken, userC.address);
      await approve(1000000000, admin, mockStakeToken, nikita.address);
      await approve(1000000000, admin, mockStakeToken, mary.address);
      await approve(1000000000, admin, mockStakeToken, mansur.address);
  
      ipfsHash = ethers.randomBytes(32);
      rewardTokenPerSecond = ethers.parseEther("1");
      poolStartTime = (await time.latest()) + 100; // Start in 100 seconds
      poolEndTime = poolStartTime + 1000; // End in 1000 seconds after start
      unstakeLockUp = poolStartTime + 500; // Lockup 500 seconds after start
      claimLockUp = poolStartTime + 200; // Lockup 200 seconds after start
      rewardTokenPerSecond = ethers.parseEther("1"); // 1 RWD per second
    });
  
    async function claimRewards(
      contract: ERC20LockUpPool,
      user: HardhatEthersSigner
    ) {
      const userBalanceBeforeClaim = await mockRewardToken.balanceOf(
        user.address
      );
      const pendingReward = await contract.pendingRewards(user.address);
      await contract.connect(user).claim();
      const userBalanceAfterClaim = await mockRewardToken.balanceOf(user.address);
      const claimed = userBalanceAfterClaim - userBalanceBeforeClaim;
      return { pendingReward, userBalanceBeforeClaim, userBalanceAfterClaim, claimed };
    }
    it("ERC20 NoLockUp: Handles multiple users staking/unstaking/claiming with reward calculations", async function () {
        poolStartTime = (await time.latest()) + 100; // Start in 100 seconds
        poolEndTime = poolStartTime + 1000; // End in 1000 seconds after start
        unstakeLockUp = poolStartTime + 500; // Lockup 500 seconds after start
        claimLockUp = poolStartTime + 200; // Lockup 200 seconds after start
        rewardTokenPerSecond = ethers.parseEther("1"); // 1 RWD per second
        console.log("poolStartTime: " + poolStartTime);
        console.log("poolEndTime: " + poolEndTime);
        console.log("unstakeLockUp: " + unstakeLockUp);
        console.log("claimLockUp: " + claimLockUp);
    
        const data = {
            stakeToken: await mockStakeToken.getAddress(),
            rewardToken: await mockRewardToken.getAddress(),
            poolStartTime: poolStartTime,
            poolEndTime: poolEndTime,
            rewardPerSecond: rewardTokenPerSecond,
            unstakeLockUpTime: poolStartTime,
            claimLockUpTime: poolStartTime,
        };
    
        const { poolContract } = await deployAndSetupPool(ipfsHash, deployer, data);
    
        // Approve and transfer stake tokens to all users
        const users = [admin, userA, userB, userC];
        let poolAddress = await poolContract.getAddress();
        for (const user of users) {
            await approve(1000000000000, user, mockStakeToken, poolAddress);
            await approve(1000000000000, admin, mockStakeToken, user.address);
            await mockStakeToken.transferFrom(admin, user, ethers.parseEther("500"));
        }
    
        // --- Initial Staking (Time = 100 seconds)
        await time.increaseTo(poolStartTime + 10);
        await poolContract.connect(userA).stake(ethers.parseEther("200"));
        expect(await mockStakeToken.balanceOf(userA.address)).to.equal(
            ethers.parseEther("300")
        ); // 500 - 200
    
        await time.increaseTo(poolStartTime + 50);
        await poolContract.connect(userC).stake(ethers.parseEther("50"));
        expect(await mockStakeToken.balanceOf(userC.address)).to.equal(
            ethers.parseEther("450")
        ); // 500 - 50
    
        // --- First Claim Period (Time = 300 seconds) ---
        await time.increaseTo(poolStartTime + 200);
    
        let userCPending = await claimRewards(poolContract, userC);
        expect(userCPending.claimed).to.be.equal(
            ethers.parseEther("30")
        ); // 0.2 share * 150 seconds = 30 RWD
    
        // --- Unstake by User C (Time = 250 seconds) ---
        await time.increaseTo(poolStartTime + 250);
        await poolContract.connect(userC).unstake(ethers.parseEther("10"));
        expect(await mockStakeToken.balanceOf(userC.address)).to.equal(
            ethers.parseEther("460")
        ); // 450 + 10
    
        // --- Second Staking by User C (Time = 300 seconds) ---
        await time.increaseTo(poolStartTime + 300);
        await poolContract.connect(userC).stake(ethers.parseEther("75"));
        expect(await mockStakeToken.balanceOf(userC.address)).to.equal(
            ethers.parseEther("385")
        ); // 460 - 75
    
        // --- First Claim by User A (Time = 300 seconds) ---
        let userAPending = await claimRewards(poolContract, userA);
        expect(userAPending.claimed).to.be.closeTo(
            ethers.parseEther("241.666667"),
            ethers.parseEther("0.00001")
        ); // Sum of Rwd pending A: 40 + 120 + 40 + 41.666667 = 241.666667
    
        // --- Staking by User B (Time = 500 seconds) ---
        await time.increaseTo(poolStartTime + 500);
        await poolContract.connect(userB).stake(ethers.parseEther("300"));
        expect(await mockStakeToken.balanceOf(userB.address)).to.equal(
            ethers.parseEther("200")
        ); // 500 - 300
    
        // --- First Claim by User B (Time = 700 seconds) ---
        await time.increaseTo(poolStartTime + 700);
        userBPending = await claimRewards(poolContract, userB);
        expect(userBPending.claimed).to.be.closeTo(
            ethers.parseEther("97.560976"),
            ethers.parseEther("0.00001")
        ); // Sum of Rwd pending B: 48.780488 + 48.780488 = 97.560976
    
        // --- Second Claim by User A (Time = 700 seconds) ---
        userAPending = await claimRewards(poolContract, userA);
        expect(userAPending.claimed).to.be.closeTo(
            ethers.parseEther("192.024777"),
            ethers.parseEther(".00001")
        ); // Sum of Rwd pending A: 0 + 65.04065 + 126.984127 = 192.024777
    
        // --- Staking by User C (Time = 800 seconds) ---
        await time.increaseTo(poolStartTime + 800);
        await poolContract.connect(userC).stake(ethers.parseEther("100"));
        expect(await mockStakeToken.balanceOf(userC.address)).to.equal(
            ethers.parseEther("285")
        ); // 385 - 100
    
        // --- Unstake by User A (Time = 990 seconds) ---
        await time.increaseTo(poolStartTime + 990);
        await poolContract.connect(userA).unstake(ethers.parseEther("200"));
        expect(await mockStakeToken.balanceOf(userA.address)).to.equal(
            ethers.parseEther("500")
        ); // 300 + 200
    
        // --- Final Claim by User A (Time = 999 seconds) ---
        await time.increaseTo(poolStartTime + 999);
        userAPending = await claimRewards(poolContract, userA);
        expect(userAPending.claimed).to.be.closeTo(
            ethers.parseEther("85.667178"),
            ethers.parseEther(".00001")
        ); // Sum of Rwd pending A: 53.146853 + 32.520325 = 85.667178
    
        // --- Unstake by User B (Time = 999 seconds) ---
        await poolContract.connect(userB).unstake(ethers.parseEther("300"));
        expect(await mockStakeToken.balanceOf(userB.address)).to.equal(
            ethers.parseEther("500")
        ); // 200 + 300
    
        // --- Final Claim by User B (Time = 1001 seconds) ---
        await time.increaseTo(poolStartTime + 1001);
        var userBPending = await claimRewards(poolContract, userB);
        expect(userBPending.claimed).to.be.closeTo(
            ethers.parseEther("133.743486"),
            ethers.parseEther(".00001")
        ); // Sum of Rwd pending B: 0 + 97.560976 + 36.182510 = 133.743486
    
        // --- Final Claim by User C (Time = 1100 seconds) ---
        await time.increaseTo(poolStartTime + 1100);
        userCPending = await claimRewards(poolContract, userC);
        expect(userCPending.claimed).to.be.closeTo(
            ethers.parseEther("209.336916"),
            ethers.parseEther(".00001")
        ); // Sum of Rwd pending C: 73.015873 + 18.699187 + 117.621856 = 209.336916
    
        // --- Unstake by User C (Time = 1105 seconds) ---
        await time.increaseTo(poolStartTime + 1105);
        await poolContract.connect(userC).unstake(ethers.parseEther("215"));
        expect(await mockStakeToken.balanceOf(userC.address)).to.equal(
            ethers.parseEther("500")
        ); // 285 + 215
    });
})