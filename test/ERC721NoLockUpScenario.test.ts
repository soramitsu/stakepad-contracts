import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
    ERC721LockUpPool,
    ERC20MockToken,
    ERC721MockToken,
    ERC721LockUpStakingFactory,
} from "../typechain";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ERC721LockUpPool Standard Scenario", async function () {
    let mockStakeToken: ERC721MockToken;
    let mockRewardToken: ERC20MockToken;
    let erc721LockUpFactory: ERC721LockUpStakingFactory;
    let erc721LockUpPool: ERC721LockUpPool;
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

        let ERC721LockUpStakingFactory = await ethers.getContractFactory(
            "ERC721LockUpStakingFactory"
        );
        let ERC721MockTokenFactory = await ethers.getContractFactory(
            "ERC721MockToken"
        );
        let ERC20MockTokenFactory = await ethers.getContractFactory(
            "ERC20MockToken"
        );

        mockStakeToken = await ERC721MockTokenFactory.deploy("StakeToken", "STK");
        mockRewardToken = await ERC20MockTokenFactory.deploy("RewardToken", "RTK", 18);
        erc721LockUpFactory = await ERC721LockUpStakingFactory.deploy();

        //First mint reward tokens for user before activating pool
        await mockRewardToken.mint(
            admin.address,
            ethers.parseEther("20000000000")
        );

        await mockRewardToken.transfer(deployer, ethers.parseEther("1000"));
        poolStartTime = (await time.latest()) + 100; // Start in 100 seconds

    });

    it("Handles ERC721NoLockup deployment", async function () {
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
        await erc721LockUpFactory.connect(deployer).requestDeployment(ipfsHash, data);
        // Approve and deploy the request
        await erc721LockUpFactory.approveRequest(0);
        // Deploy approved request
        await mockRewardToken.connect(deployer).approve(erc721LockUpFactory.getAddress(), ethers.parseEther("1000"));
        await erc721LockUpFactory.connect(deployer).deploy(0);

        const users = [user_A, user_B, user_C];
        let poolAddress = await erc721LockUpFactory.stakingPools(0);
        erc721LockUpPool = await ethers.getContractAt("ERC721LockUpPool", poolAddress);
        for (const user of users) {
            for (let i = 0; i < 10; i++) {
                await mockStakeToken.safeMint(
                    user.address
                );
            }
            await mockStakeToken.connect(user).setApprovalForAll(poolAddress, true);
        }
    });

    it("Handles ERC20NoLockup reward calculation scenario", async function () {

        let poolInfo = await erc721LockUpPool.pool();
        // --- Initial Staking (Time = 10 seconds after pool was started)
        await time.increaseTo(poolInfo.startTime + 9n);
        let scenarioStartTime = await time.latest();
        await erc721LockUpPool.connect(user_A).stake([0,1,2,3,4]);
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(5);
        console.log("1st block timestamp:", (await time.latest() - poolStartTime));

        // Time = 50 seconds after pool was started
        await time.increaseTo(await time.latest() + 39);
        await erc721LockUpPool.connect(user_C).stake([20, 21]);
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("40"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(7);
        console.log("2nd block timestamp:", (await time.latest() - poolStartTime));

        // Time = 200 seconds after pool was started
        await time.increaseTo(await time.latest() + 149);
        await erc721LockUpPool.connect(user_C).claim();
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("147.142857142857142857"));
        expect(await mockRewardToken.balanceOf(user_C.getAddress())).to.be.equal(ethers.parseEther("42.857142857142857142"));
        expect(((await erc721LockUpPool.userInfo(user_C.getAddress())).claimed)).to.be.equal(ethers.parseEther("42.857142857142857142"));
        console.log("3rd block timestamp:", (await time.latest() - poolStartTime));

        // Time = 250 seconds after pool was started
        await time.increaseTo(await time.latest() + 49);
        await erc721LockUpPool.connect(user_C).unstake([21]);
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("182.857142857142857142"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("14.285714285714285715"));
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(6);
        console.log("4th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 300 seconds after pool was started
        await time.increaseTo(await time.latest() + 49);
        await erc721LockUpPool.connect(user_C).stake([21, 22]);
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("22.619047619047619048"));
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("224.523809523809523809"));
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(8);
        console.log("5th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 301 seconds after pool was started
        await erc721LockUpPool.connect(user_A).claim();
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("22.994047619047619048"));
        expect(await mockRewardToken.balanceOf(user_A.getAddress())).to.be.equal(ethers.parseEther("225.148809523809523809"));
        expect(((await erc721LockUpPool.userInfo(user_A.getAddress())).claimed)).to.be.equal(ethers.parseEther("225.148809523809523809"));
        console.log("6th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 500 seconds after pool was started
        await time.increaseTo(await time.latest() + 198);
        await erc721LockUpPool.connect(user_B).stake([10,11,12,13,14,15,16]);
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("97.619047619047619048"));
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("124.375"));
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(15);
        console.log("7th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 700 seconds after pool was started
        await time.increaseTo(await time.latest() + 199);
        await erc721LockUpPool.connect(user_B).claim();
        expect(await mockRewardToken.balanceOf(user_B.getAddress())).to.be.equal(ethers.parseEther("93.333333333333333333"));
        expect(((await erc721LockUpPool.userInfo(user_B.getAddress())).claimed)).to.be.equal(ethers.parseEther("93.333333333333333333"));
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("191.041666666666666667"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("137.619047619047619048"));
        console.log("8th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 701 seconds after pool was started
        await erc721LockUpPool.connect(user_A).claim();
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0.466666666666666667"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("137.819047619047619048"));
        expect(await mockRewardToken.balanceOf(user_A.getAddress())).to.be.equal(ethers.parseEther("416.523809523809523809"));
        expect(((await erc721LockUpPool.userInfo(user_A.getAddress())).claimed)).to.be.equal(ethers.parseEther("416.523809523809523809"));
        console.log("9th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 800 seconds after pool was started
        await time.increaseTo(await time.latest() + 98);
        await erc721LockUpPool.connect(user_C).stake([23]);
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("33"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("46.666666666666666667"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("157.619047619047619048"));
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(16);
        console.log("10th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 990 seconds after pool was started
        await time.increaseTo(await time.latest() + 189);
        await erc721LockUpPool.connect(user_A).unstake([0,1,2,3,4]);
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("92.375"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("129.791666666666666667"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("205.119047619047619048"));
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(11);
        console.log("11th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 998 seconds after pool was started
        await time.increaseTo(await time.latest() + 7);
        await erc721LockUpPool.connect(user_A).claim();
        expect(await mockRewardToken.balanceOf(user_A.getAddress())).to.be.equal(ethers.parseEther("508.898809523809523809"));
        expect(((await erc721LockUpPool.userInfo(user_A.getAddress())).claimed)).to.be.equal(ethers.parseEther("508.898809523809523809"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("134.882575757575757576"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("208.028138528138528139"));
        console.log("12th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 999 seconds after pool was started
        await erc721LockUpPool.connect(user_B).unstake([10,11,12,13,14,15,16]);
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("135.51893939393939394"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("208.391774891774891775"));
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(4);
        console.log("13th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 1001 seconds after pool was started
        await time.increaseTo(await time.latest() + 1);
        await erc721LockUpPool.connect(user_B).claim();
        // 97.560975609756097560 + 133.743485971759710720
        expect(await mockRewardToken.balanceOf(user_B.getAddress())).to.be.equal(ethers.parseEther("228.852272727272727273"));
        expect(((await erc721LockUpPool.userInfo(user_B.getAddress())).claimed)).to.be.equal(ethers.parseEther("228.852272727272727273"));
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("209.391774891774891775"));
        console.log("14th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 1100 seconds after pool was started
        await time.increaseTo(await time.latest() + 98);
        await erc721LockUpPool.connect(user_C).claim();
        expect(await mockRewardToken.balanceOf(user_C.getAddress())).to.be.equal(ethers.parseEther("252.248917748917748917"));
        expect(((await erc721LockUpPool.userInfo(user_C.getAddress())).claimed)).to.be.equal(ethers.parseEther("252.248917748917748917"));
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(4);
        console.log("15th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 1105 seconds after pool was started
        await time.increaseTo(await time.latest() + 4);
        await erc721LockUpPool.connect(user_C).unstake([20,21,22,23]);
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(0);
        console.log("16th block timestamp:", (await time.latest() - poolStartTime));

    });
});