import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  ERC20LockUpPool,
  ERC20MockToken,
  ERC20LockUpStakingFactory,
} from "../typechain";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ERC20LockupPool Standard Scenario", async function () {
  let mockStakeToken: ERC20MockToken;
  let mockRewardToken: ERC20MockToken;
  let erc20LockUpFactory: ERC20LockUpStakingFactory;
  let erc20LockUpPool: ERC20LockUpPool;
  let admin: HardhatEthersSigner;
  let deployer: HardhatEthersSigner;
  let user_A: HardhatEthersSigner;
  let user_B: HardhatEthersSigner;
  let user_C: HardhatEthersSigner;

  let poolStartTime: number;

  before(async function () {
    // Get signers
    [admin, deployer, user_A, user_B, user_C] =
      await ethers.getSigners();

    let ERC20LockUpStakingFactory = await ethers.getContractFactory(
      "ERC20LockUpStakingFactory"
    );
    let ERC20MockTokenFactory = await ethers.getContractFactory(
      "ERC20MockToken"
    );

    mockStakeToken = await ERC20MockTokenFactory.deploy("StakeToken", "STK", 18);
    mockRewardToken = await ERC20MockTokenFactory.deploy("RewardToken", "RTK", 18);
    erc20LockUpFactory = await ERC20LockUpStakingFactory.deploy();

    //First mint reward tokens for user before activating pool
    await mockStakeToken.mint(
      admin.address,
      ethers.parseEther("20000000000")
    );
    await mockRewardToken.mint(
      admin.address,
      ethers.parseEther("20000000000")
    );

    await mockRewardToken.transfer(deployer, ethers.parseEther("1000"));
    poolStartTime = (await time.latest()) + 100; // Start in 100 seconds

  });

  it("Handles ERC20NoLockup deployment", async function () {
    // Set pool parameters
    let ipfsHash = ethers.randomBytes(32);
    const data = {
      stakeToken: await mockStakeToken.getAddress(),
      rewardToken: await mockRewardToken.getAddress(),
      poolStartTime: poolStartTime,
      poolEndTime: poolStartTime + 1000,
      unstakeLockUpTime: 0,
      claimLockUpTime: 0,
      rewardPerSecond: ethers.parseEther("1"),
    };

    // Create deployment request
    await erc20LockUpFactory.connect(deployer).requestDeployment(ipfsHash, data);
    // Approve and deploy the request
    await erc20LockUpFactory.approveRequest(0);
    // Deploy approved request
    await mockRewardToken.connect(deployer).approve(erc20LockUpFactory.getAddress(), ethers.parseEther("1000"));
    await erc20LockUpFactory.connect(deployer).deploy(0);

    const users = [user_A, user_B, user_C];
    let poolAddress = await erc20LockUpFactory.stakingPools(0);
    erc20LockUpPool = await ethers.getContractAt("ERC20LockUpPool", poolAddress);
    for (const user of users) {
      await mockStakeToken.transfer(user, ethers.parseEther("500"));
      await mockStakeToken.connect(user).approve(poolAddress, ethers.parseEther("100000"));
    }

  });

  it("Handles ERC20NoLockup reward calculation scenario", async function () {

    let poolInfo = await erc20LockUpPool.pool();
    // --- Initial Staking (Time = 10 seconds after pool was started)
    await time.increaseTo(poolInfo.startTime + 9n);
    let scenarioStartTime = await time.latest();
    await erc20LockUpPool.connect(user_A).stake(ethers.parseEther("200"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("200"));
    console.log("1st block timestamp:", (await time.latest() - poolStartTime));

    // Time = 50 seconds after pool was started
    await time.increaseTo(await time.latest() + 39);
    await erc20LockUpPool.connect(user_C).stake(ethers.parseEther("50"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("40"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("250"));
    console.log("2nd block timestamp:", (await time.latest() - poolStartTime));

    // Time = 200 seconds after pool was started
    await time.increaseTo(await time.latest() + 149);
    await erc20LockUpPool.connect(user_C).claim();
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("160"));
    expect(await mockRewardToken.balanceOf(user_C.getAddress())).to.be.equal(ethers.parseEther("30"));
    expect(((await erc20LockUpPool.userInfo(user_C.getAddress())).claimed)).to.be.equal(ethers.parseEther("30"));
    console.log("3rd block timestamp:", (await time.latest() - poolStartTime));

    // Time = 250 seconds after pool was started
    await time.increaseTo(await time.latest() + 49);
    await erc20LockUpPool.connect(user_C).unstake(ethers.parseEther("10"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("200"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("10"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("240"));
    console.log("4th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 300 seconds after pool was started
    await time.increaseTo(await time.latest() + 49);
    await erc20LockUpPool.connect(user_C).stake(ethers.parseEther("75"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("18.333333333333333332"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("241.666666666666666660"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("315"));
    console.log("5th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 301 seconds after pool was started
    await erc20LockUpPool.connect(user_A).claim();
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("18.698412698412698411"));
    expect(await mockRewardToken.balanceOf(user_A.getAddress())).to.be.equal(ethers.parseEther("242.301587301587301580"));
    expect(((await erc20LockUpPool.userInfo(user_A.getAddress())).claimed)).to.be.equal(ethers.parseEther("242.301587301587301580"));
    console.log("6th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 500 seconds after pool was started
    await time.increaseTo(await time.latest() + 198);
    await erc20LockUpPool.connect(user_B).stake(ethers.parseEther("300"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("91.349206349206349201"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("126.349206349206349200"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("615"));
    console.log("7th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 700 seconds after pool was started
    await time.increaseTo(await time.latest() + 199);
    await erc20LockUpPool.connect(user_B).claim();
    expect(await mockRewardToken.balanceOf(user_B.getAddress())).to.be.equal(ethers.parseEther("97.560975609756097560"));
    expect(((await erc20LockUpPool.userInfo(user_B.getAddress())).claimed)).to.be.equal(ethers.parseEther("97.560975609756097560"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("191.389856755710414240"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("128.747580332946186599"));
    console.log("8th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 701 seconds after pool was started
    await erc20LockUpPool.connect(user_A).claim();
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0.487804878048780480"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("128.934572202864885783"));
    // 242.301587301587301580 + 191.715060007742934560
    expect(await mockRewardToken.balanceOf(user_A.getAddress())).to.be.equal(ethers.parseEther("434.01664730933023614"));
    expect(((await erc20LockUpPool.userInfo(user_A.getAddress())).claimed)).to.be.equal(ethers.parseEther("434.01664730933023614"));
    console.log("9th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 800 seconds after pool was started
    await time.increaseTo(await time.latest() + 98);
    await erc20LockUpPool.connect(user_C).stake(ethers.parseEther("100"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("32.195121951219512180"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("48.780487804878048750"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("147.446767324816105287"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("715"));
    console.log("10th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 990 seconds after pool was started
    await time.increaseTo(await time.latest() + 189);
    await erc20LockUpPool.connect(user_A).unstake(ethers.parseEther("200"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("85.341975098072659020"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("128.500767525157769010"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("204.579634457683238140"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("515"));
    console.log("11th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 998 seconds after pool was started
    await time.increaseTo(await time.latest() + 7);
    await erc20LockUpPool.connect(user_A).claim();
    // 434.01664730933023614 + 85.341975098072659020
    expect(await mockRewardToken.balanceOf(user_A.getAddress())).to.be.equal(ethers.parseEther("519.35862240740289516"));
    expect(((await erc20LockUpPool.userInfo(user_A.getAddress())).claimed)).to.be.equal(ethers.parseEther("519.35862240740289516"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("133.160961699915050550"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("207.919440282925956577"));
    console.log("12th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 999 seconds after pool was started
    await erc20LockUpPool.connect(user_B).unstake(ethers.parseEther("300"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("133.743485971759710720"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("208.336916011081296365"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("215"));
    console.log("13th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 1001 seconds after pool was started
    await time.increaseTo(await time.latest() + 1);
    await erc20LockUpPool.connect(user_B).claim();
    // 97.560975609756097560 + 133.743485971759710720
    expect(await mockRewardToken.balanceOf(user_B.getAddress())).to.be.equal(ethers.parseEther("231.30446158151580828"));
    expect(((await erc20LockUpPool.userInfo(user_B.getAddress())).claimed)).to.be.equal(ethers.parseEther("231.30446158151580828"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("209.336916011081296361"));
    console.log("14th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 1100 seconds after pool was started
    await time.increaseTo(await time.latest() + 98);
    await erc20LockUpPool.connect(user_C).claim();
    // 30.0 + 209.336916011081296361
    expect(await mockRewardToken.balanceOf(user_C.getAddress())).to.be.equal(ethers.parseEther("239.336916011081296361"));
    expect(((await erc20LockUpPool.userInfo(user_C.getAddress())).claimed)).to.be.equal(ethers.parseEther("239.336916011081296361"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("215"));
    console.log("15th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 1105 seconds after pool was started
    await time.increaseTo(await time.latest() + 4);
    await erc20LockUpPool.connect(user_C).unstake(ethers.parseEther("215"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(0);
    console.log("16th block timestamp:", (await time.latest() - poolStartTime));

  });
});