import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
    ERC20PenaltyFeePool,
    ERC20MockToken,
    ERC20PenaltyFeeStakingFactory,
} from "../typechain";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ERC20PenaltyPool Standard Scenario", async function () {
    let mockStakeToken: ERC20MockToken;
    let mockRewardToken: ERC20MockToken;
    let erc20PenaltyFeeFactory: ERC20PenaltyFeeStakingFactory;
    let erc20PenaltyPool: ERC20PenaltyFeePool;
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

        let ERC20PenaltyFeeStakingFactory = await ethers.getContractFactory(
            "ERC20PenaltyFeeStakingFactory"
        );
        let ERC20MockTokenFactory = await ethers.getContractFactory(
            "ERC20MockToken"
        );

        mockStakeToken = await ERC20MockTokenFactory.deploy("StakeToken", "STK", 18);
        mockRewardToken = await ERC20MockTokenFactory.deploy("RewardToken", "RTK", 18);
        erc20PenaltyFeeFactory = await ERC20PenaltyFeeStakingFactory.deploy();

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

    it("Handles ERC20PenaltyFeePool deployment", async function () {
        // Set pool parameters
        let ipfsHash = ethers.randomBytes(32);
        const data = {
            stakeToken: await mockStakeToken.getAddress(),
            rewardToken: await mockRewardToken.getAddress(),
            poolStartTime: poolStartTime,
            poolEndTime: poolStartTime + 1000,
            rewardPerSecond: ethers.parseEther("1"),
            penaltyPeriod: 200
        };

        // Create deployment request
        await erc20PenaltyFeeFactory.connect(deployer).requestDeployment(ipfsHash, data);
        // Approve and deploy the request
        await erc20PenaltyFeeFactory.approveRequest(0);
        // Deploy approved request
        await mockRewardToken.connect(deployer).approve(erc20PenaltyFeeFactory.getAddress(), ethers.parseEther("1000"));
        await erc20PenaltyFeeFactory.connect(deployer).deploy(0);

        const users = [user_A, user_B, user_C];
        let poolAddress = await erc20PenaltyFeeFactory.stakingPools(0);
        erc20PenaltyPool = await ethers.getContractAt("ERC20PenaltyFeePool", poolAddress);
        for (const user of users) {
            await mockStakeToken.transfer(user, ethers.parseEther("500"));
            await mockStakeToken.connect(user).approve(poolAddress, ethers.parseEther("100000"));
        }

    });

    it("Handles ERC20PenaltyFeePool reward calculation scenario", async function () {
        let poolInfo = await erc20PenaltyPool.pool();
        // --- Initial Staking (Time = 10 seconds after pool was started)
        await time.increaseTo(poolInfo.startTime + 9n);
        await erc20PenaltyPool.connect(user_A).stake(ethers.parseEther("300"));
        expect((await erc20PenaltyPool.pool()).totalStaked).to.be.equal(ethers.parseEther("300"));
        console.log("1st block timestamp:", (await time.latest() - poolStartTime));

        // Time = 50 seconds after pool was started
        await time.increaseTo(await time.latest() + 39);
        await erc20PenaltyPool.connect(user_B).stake(ethers.parseEther("400"));
        expect(await erc20PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("39.599999999999999991"));
        expect(await erc20PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc20PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc20PenaltyPool.pool()).totalStaked).to.be.equal(ethers.parseEther("700"));
        console.log("2nd block timestamp:", (await time.latest() - poolStartTime));

        // Time = 200 seconds after pool was started
        await time.increaseTo(await time.latest() + 149);
        await erc20PenaltyPool.connect(user_B).unstake(ethers.parseEther("100"));
        expect(await erc20PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("103.242857142857142843"));
        expect(await erc20PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("64.28571428571428571"));
        expect(await erc20PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc20PenaltyPool.pool()).totalStaked).to.be.equal(ethers.parseEther("600"));
        console.log("3rd block timestamp:", (await time.latest() - poolStartTime));

        // Time = 250 seconds after pool was started
        await time.increaseTo(await time.latest() + 49);
        await erc20PenaltyPool.connect(user_A).claim();
        expect(await mockRewardToken.balanceOf(user_A.getAddress())).to.be.equal(ethers.parseEther("127.992857142857142834"));
        expect(((await erc20PenaltyPool.userInfo(user_A.getAddress())).claimed)).to.be.equal(ethers.parseEther("127.992857142857142834"));
        expect(await erc20PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("83.035714285714285703"));
        expect(await erc20PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
        console.log("4th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 300 seconds after pool was started
        await time.increaseTo(await time.latest() + 49);
        await erc20PenaltyPool.connect(user_C).stake(ethers.parseEther("250"));
        expect(await erc20PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("24.749999999999999991"));
        expect(await erc20PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("101.785714285714285695"));
        expect((await erc20PenaltyPool.pool()).totalStaked).to.be.equal(ethers.parseEther("850"));
        console.log("5th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 301 seconds after pool was started
        await erc20PenaltyPool.connect(user_C).stake(ethers.parseEther("250"));
        expect(await erc20PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("25.099411764705882338"));
        expect(await erc20PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("102.050420168067226868"));
        expect(await erc20PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0.29117647058823529"));
        expect((await erc20PenaltyPool.pool()).totalStaked).to.be.equal(ethers.parseEther("1100"));
        console.log("6th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 500 seconds after pool was started
        await time.increaseTo(await time.latest() + 198);
        await erc20PenaltyPool.connect(user_C).unstake(ethers.parseEther("200"));
        expect(await erc20PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("78.829411764705882311"));
        expect(await erc20PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("142.754965622612681393"));
        expect(await erc20PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("68.061497326203208519"));
        expect((await erc20PenaltyPool.pool()).totalStaked).to.be.equal(ethers.parseEther("900"));
        console.log("7th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 700 seconds after pool was started
        await time.increaseTo(await time.latest() + 199);
        await erc20PenaltyPool.connect(user_A).stake(ethers.parseEther("150"));
        expect(await erc20PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("144.829411764705882305"));
        expect(await erc20PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("192.754965622612681388"));
        expect(await erc20PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("118.061497326203208514"));
        expect((await erc20PenaltyPool.pool()).totalStaked).to.be.equal(ethers.parseEther("1050"));
        console.log("8th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 701 seconds after pool was started
        await erc20PenaltyPool.connect(user_C).claim();
        expect(await erc20PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("145.253697478991596554"));
        expect(await erc20PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("192.969251336898395655"));

        expect(await mockRewardToken.balanceOf(user_C.getAddress())).to.be.equal(ethers.parseEther("118.275783040488922782"));
        expect(((await erc20PenaltyPool.userInfo(user_C.getAddress())).claimed)).to.be.equal(ethers.parseEther("118.275783040488922782"));
        console.log("9th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 800 seconds after pool was started
        await time.increaseTo(await time.latest() + 98);
        await erc20PenaltyPool.connect(user_B).claim();
        expect(await erc20PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("187.257983193277310834"));
        expect(await erc20PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("28.002857142857142853"));
        expect(await mockRewardToken.balanceOf(user_B.getAddress())).to.be.equal(ethers.parseEther("214.183537051184109938"));
        expect(((await erc20PenaltyPool.userInfo(user_B.getAddress())).claimed)).to.be.equal(ethers.parseEther("214.183537051184109938"));
        console.log("10th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 990 seconds after pool was started
        await time.increaseTo(await time.latest() + 189);
        await erc20PenaltyPool.connect(user_B).unstake(ethers.parseEther("300"));
        expect(await erc20PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("267.872268907563025083"));
        expect(await erc20PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("53.742857142857142834"));
        expect(await erc20PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("81.745714285714285686"));
        expect((await erc20PenaltyPool.pool()).totalStaked).to.be.equal(ethers.parseEther("750"));
        console.log("11th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 998 seconds after pool was started
        await time.increaseTo(await time.latest() + 7);
        await erc20PenaltyPool.connect(user_A).unstake(ethers.parseEther("450"));
        expect(await erc20PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("272.624268907563025054"));
        expect(await erc20PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("53.742857142857142834"));
        expect(await erc20PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("84.913714285714285667"));
        expect((await erc20PenaltyPool.pool()).totalStaked).to.be.equal(ethers.parseEther("300"));
        console.log("12th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 999 seconds after pool was started
        await erc20PenaltyPool.connect(user_A).claim();
        expect(await erc20PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("53.742857142857142834"));
        expect(await erc20PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("85.903714285714285657"));
        expect(await mockRewardToken.balanceOf(user_A.getAddress())).to.be.equal(ethers.parseEther("400.617126050420167888"));
        expect(((await erc20PenaltyPool.userInfo(user_A.getAddress())).claimed)).to.be.equal(ethers.parseEther("400.617126050420167888"));
        console.log("13th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 1001 seconds after pool was started
        await time.increaseTo(await time.latest() + 1);
        await erc20PenaltyPool.connect(user_B).claim();
        // 97.560975609756097560 + 133.743485971759710720
        expect(await mockRewardToken.balanceOf(user_B.getAddress())).to.be.equal(ethers.parseEther("267.926394194041252772"));
        expect(((await erc20PenaltyPool.userInfo(user_B.getAddress())).claimed)).to.be.equal(ethers.parseEther("267.926394194041252772"));
        expect(await erc20PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc20PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("86.893714285714285647"));
        console.log("14th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 1100 seconds after pool was started
        await time.increaseTo(await time.latest() + 98);
        await erc20PenaltyPool.connect(user_C).claim();
        // 30.0 + 209.336916011081296361
        expect(await mockRewardToken.balanceOf(user_C.getAddress())).to.be.equal(ethers.parseEther("205.169497326203208429"));
        expect(((await erc20PenaltyPool.userInfo(user_C.getAddress())).claimed)).to.be.equal(ethers.parseEther("205.169497326203208429"));
        expect(await erc20PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc20PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc20PenaltyPool.pool()).totalStaked).to.be.equal(ethers.parseEther("300"));
        console.log("15th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 1105 seconds after pool was started
        await time.increaseTo(await time.latest() + 4);
        await erc20PenaltyPool.connect(user_C).unstake(ethers.parseEther("300"));
        expect(await erc20PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc20PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc20PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc20PenaltyPool.pool()).totalStaked).to.be.equal(0);
        console.log("16th block timestamp:", (await time.latest() - poolStartTime));

    });
});