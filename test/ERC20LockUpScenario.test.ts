import { expect } from "chai";
import { ethers, network } from "hardhat";
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

  it("Handles ERC20LockupPool deployment", async function () {
    // Set pool parameters
    let ipfsHash = ethers.randomBytes(32);
    const data = {
      stakeToken: await mockStakeToken.getAddress(),
      rewardToken: await mockRewardToken.getAddress(),
      poolStartTime: poolStartTime,
      poolEndTime: poolStartTime + 1000,
      rewardPerSecond: ethers.parseEther("1"),
      unstakeLockUpTime: 500,
      claimLockUpTime: 300
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

  it("Handles ERC20LockupPool reward calculation scenario", async function () {

    let poolInfo = await erc20LockUpPool.pool();
    // --- Initial Staking (Time = 10 seconds after pool was started)
    await time.increaseTo(poolInfo.startTime + 9n);
    await erc20LockUpPool.connect(user_A).stake(ethers.parseEther("500"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("500"));
    console.log("1st block timestamp:", (await time.latest() - poolStartTime));

    // Time = 50 seconds after pool was started
    await time.increaseTo(await time.latest() + 39);
    await erc20LockUpPool.connect(user_B).stake(ethers.parseEther("210"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("40"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("710"));
    console.log("2nd block timestamp:", (await time.latest() - poolStartTime));

    // Time = 200 seconds after pool was started
    await time.increaseTo(await time.latest() + 149);
    await erc20LockUpPool.connect(user_B).stake(ethers.parseEther("230"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("145.633802816901408450"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("44.366197183098591549"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("940"));
    console.log("3rd block timestamp:", (await time.latest() - poolStartTime));

    // Time = 250 seconds after pool was started
    await time.increaseTo(await time.latest() + 50);
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("172.229547497752472250"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("67.770452502247527693"));
    console.log("4th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 300 seconds after pool was started
    await time.increaseTo(await time.latest() + 50);
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("198.825292178603536100"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("91.174707821396463881"));
    console.log("5th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 301 seconds after pool was started
    await erc20LockUpPool.connect(user_A).claim();
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("91.642792927779442581"));
    expect(await mockRewardToken.balanceOf(user_A.getAddress())).to.be.equal(ethers.parseEther("199.357207072220557350"));
    expect(((await erc20LockUpPool.userInfo(user_A.getAddress())).claimed)).to.be.equal(ethers.parseEther("199.357207072220557350"));
    console.log("6th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 500 seconds after pool was started
    await time.increaseTo(await time.latest() + 199);
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("105.851063829787234000"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("184.791729097992208501"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("940"));
    console.log("7th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 700 seconds after pool was started
    await time.increaseTo(await time.latest() + 199);
    await erc20LockUpPool.connect(user_B).unstake(ethers.parseEther("20"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("212.234042553191489350"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("278.408750374587953209"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("920"));
    console.log("8th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 701 seconds after pool was started
    await erc20LockUpPool.connect(user_C).stake(ethers.parseEther("460"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("212.777520814061054550"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("278.865272113718387977"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("1380"));
    console.log("9th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 800 seconds after pool was started
    await time.increaseTo(await time.latest() + 98);
    await erc20LockUpPool.connect(user_B).claim();
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("248.647086031452358850"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("32.999999999999999956"));
    expect(await mockRewardToken.balanceOf(user_B.getAddress())).to.be.equal(ethers.parseEther("308.995706896327083589"));
    expect(((await erc20LockUpPool.userInfo(user_B.getAddress())).claimed)).to.be.equal(ethers.parseEther("308.995706896327083589"));
    console.log("10th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 990 seconds after pool was started
    await time.increaseTo(await time.latest() + 189);
    await erc20LockUpPool.connect(user_A).unstake(ethers.parseEther("500"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("317.487665741597286350"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("57.826086956521739100"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("96.333333333333333256"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("880"));
    console.log("11th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 998 seconds after pool was started
    await time.increaseTo(await time.latest() + 7);
    await erc20LockUpPool.connect(user_A).claim();
    expect(await mockRewardToken.balanceOf(user_A.getAddress())).to.be.equal(ethers.parseEther("516.844872813817843700"));
    expect(((await erc20LockUpPool.userInfo(user_A.getAddress())).claimed)).to.be.equal(ethers.parseEther("516.844872813817843700"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("61.644268774703557278"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("100.515151515151515070"));
    console.log("12th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 999 seconds after pool was started
    await erc20LockUpPool.connect(user_B).unstake(ethers.parseEther("420"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("62.121541501976284524"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("101.037878787878787768"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("460"));
    console.log("13th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 1001 seconds after pool was started
    await time.increaseTo(await time.latest() + 1);
    await network.provider.send("evm_setAutomine", [false]);
    await erc20LockUpPool.connect(user_C).unstake(ethers.parseEther("460"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("62.121541501976284524"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("102.037878787878787736"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("460"));

    await erc20LockUpPool.connect(user_B).claim();
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("102.037878787878787736"));
    expect(await mockRewardToken.balanceOf(user_B.getAddress())).to.be.equal(ethers.parseEther("308.995706896327083589"));
    expect(((await erc20LockUpPool.userInfo(user_B.getAddress())).claimed)).to.be.equal(ethers.parseEther("308.995706896327083589"));
    await network.provider.send("evm_setAutomine", [true]);
    console.log("14th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 1100 seconds after pool was started
    await time.increaseTo(await time.latest() + 98);
    await erc20LockUpPool.connect(user_C).claim();
    expect(await mockRewardToken.balanceOf(user_C.getAddress())).to.be.equal(ethers.parseEther("102.037878787878787736"));
    expect(((await erc20LockUpPool.userInfo(user_C.getAddress())).claimed)).to.be.equal(ethers.parseEther("102.037878787878787736"));
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(ethers.parseEther("0"));
    console.log("15th block timestamp:", (await time.latest() - poolStartTime));

    // Time = 1105 seconds after pool was started
    await time.increaseTo(await time.latest() + 5);
    expect(await erc20LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect(await erc20LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect(await erc20LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
    expect((await erc20LockUpPool.pool()).totalStaked).to.be.equal(0);
    console.log("16th block timestamp:", (await time.latest() - poolStartTime));

  });
});