import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
    ERC721PenaltyFeePool,
    ERC20MockToken,
    ERC721MockToken,
    ERC721PenaltyFeeStakingFactory,
    RequestManager
} from "../../typechain";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ERC721PenaltyPool Reward Calculation Scenario", async function () {
    let mockStakeToken: ERC721MockToken;
    let mockRewardToken: ERC20MockToken;
    let requestManager: RequestManager;
    let erc721PenaltyFactory: ERC721PenaltyFeeStakingFactory;
    let erc721PenaltyPool: ERC721PenaltyFeePool;
    let admin: HardhatEthersSigner;
    let deployer: HardhatEthersSigner;
    let user_A: HardhatEthersSigner;
    let user_B: HardhatEthersSigner;
    let user_C: HardhatEthersSigner;
    let poolStartTime: number;

    let coder = ethers.AbiCoder.defaultAbiCoder();

    before(async function () {
        // Get signers
        [admin, deployer, user_A, user_B, user_C] =
            await ethers.getSigners();

        let RequestManagerFactory = await ethers.getContractFactory(
            "RequestManager"
        );

        let ERC721PenaltyStakingFactory = await ethers.getContractFactory(
            "ERC721PenaltyFeeStakingFactory"
        );
        let ERC721MockTokenFactory = await ethers.getContractFactory(
            "ERC721MockToken"
        );
        let ERC20MockTokenFactory = await ethers.getContractFactory(
            "ERC20MockToken"
        );

        mockStakeToken = await ERC721MockTokenFactory.deploy("StakeToken", "STK");
        mockRewardToken = await ERC20MockTokenFactory.deploy("RewardToken", "RTK", 18);
        requestManager = await RequestManagerFactory.deploy();
        erc721PenaltyFactory = await ERC721PenaltyStakingFactory.deploy(await requestManager.getAddress());
        await requestManager.addFactory(await erc721PenaltyFactory.getAddress());

        //First mint reward tokens for user before activating pool
        await mockRewardToken.mint(
            admin.address,
            ethers.parseEther("20000000000")
        );

        await mockRewardToken.transfer(deployer, ethers.parseEther("1000"));
        poolStartTime = (await time.latest()) + 100; // Start in 100 seconds

    });

    it("Handles ERC721PenaltyPool deployment", async function () {
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

        let encoded = coder.encode(["tuple(address stakeToken, address rewardToken, uint poolStartTime, uint poolEndTime, uint rewardPerSecond, uint penaltyPeriod)"], [data]);
        let requestPayload = {
            ipfsHash: ipfsHash,
            deployer: deployer.address,
            factory: await erc721PenaltyFactory.getAddress(),
            stakingData: encoded
        }
        // Create deployment request
        await requestManager.connect(deployer).requestDeployment(requestPayload);
        // Approve and deploy the request
        await requestManager.approveRequest(0);
        // Deploy approved request
        await mockRewardToken.connect(deployer).approve(erc721PenaltyFactory.getAddress(), ethers.parseEther("1000"));
        await requestManager.connect(deployer).deploy(0);

        const users = [user_A, user_B, user_C];
        let poolAddress = await erc721PenaltyFactory.stakingPools(0);
        erc721PenaltyPool = await ethers.getContractAt("ERC721PenaltyFeePool", poolAddress);
        for (const user of users) {
            for (let i = 0; i < 10; i++) {
                await mockStakeToken.safeMint(
                    user.address
                );
            }
            await mockStakeToken.connect(user).setApprovalForAll(poolAddress, true);
        }
    });

    it("ERC721PenaltyFeePool reward calculation scenario, Initial Staking (Time = 10 seconds after pool was started)", async function () {
        let poolInfo = await erc721PenaltyPool.pool();
        // --- Initial Staking (Time = 10 seconds after pool was started)
        await time.increaseTo(poolInfo.startTime + 9n);
        await erc721PenaltyPool.connect(user_A).stake([0, 1, 2, 3, 4, 5]);
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(6);
        console.log("1st block timestamp:", (await time.latest() - poolStartTime));
    });

    it("Time = 50 seconds after pool was started", async function () {
        await time.increaseTo(await time.latest() + 39);
        await erc721PenaltyPool.connect(user_B).stake([10, 11, 12, 13, 14, 15, 16, 17]);
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("39.6"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(14);
        console.log("2nd block timestamp:", (await time.latest() - poolStartTime));
    });

    it("Time = 200 seconds after pool was started", async function () {
        await time.increaseTo(await time.latest() + 149);
        await erc721PenaltyPool.connect(user_B).unstake([10]);
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("103.242857142857142857"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("64.285714285714285715"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(13);
        console.log("3rd block timestamp:", (await time.latest() - poolStartTime));
    });

    it("Time = 250 seconds after pool was started", async function () {
        await time.increaseTo(await time.latest() + 49);
        await erc721PenaltyPool.connect(user_A).claim();
        expect(await mockRewardToken.balanceOf(user_A.getAddress())).to.be.equal(ethers.parseEther("126.089010989010989011"));
        expect(((await erc721PenaltyPool.userInfo(user_A.getAddress())).claimed)).to.be.equal(ethers.parseEther("126.089010989010989011"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("84.478021978021978023"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
        console.log("4th block timestamp:", (await time.latest() - poolStartTime));
    });

    it("Time = 300 seconds after pool was started", async function () {
        await time.increaseTo(await time.latest() + 49);
        await erc721PenaltyPool.connect(user_C).stake([20, 21, 22, 23, 24]);
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("22.846153846153846154"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("104.670329670329670330"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(18);
        console.log("5th block timestamp:", (await time.latest() - poolStartTime));
    });

    it("Time = 301 seconds after pool was started", async function () {
        await erc721PenaltyPool.connect(user_C).stake([25, 26, 27, 28, 29]);
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("23.176153846153846154"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("104.961996336996336997"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0.275000000000000001"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(23);
        console.log("6th block timestamp:", (await time.latest() - poolStartTime));
    });

    it("Time = 500 seconds after pool was started", async function () {
        await time.increaseTo(await time.latest() + 198);
        await erc721PenaltyPool.connect(user_C).unstake([20, 21, 22, 23]);
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("74.570066889632107023"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("150.385909380474597867"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("65.099637681159420290"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(19);
        console.log("7th block timestamp:", (await time.latest() - poolStartTime));
    });

    it("Time = 700 seconds after pool was started", async function () {
        await time.increaseTo(await time.latest() + 199);
        await erc721PenaltyPool.connect(user_A).stake([6, 7, 8]);
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("137.096382679105791235"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("205.649067275211439972"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("112.468058733790999238"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(22);
        console.log("8th block timestamp:", (await time.latest() - poolStartTime));
    });

    it("Time = 701 seconds after pool was started", async function () {
        await erc721PenaltyPool.connect(user_C).claim();
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("137.501382679105791235"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("205.887703638847803608"));

        expect(await mockRewardToken.balanceOf(user_C.getAddress())).to.be.equal(ethers.parseEther("112.672604188336453783"));
        expect(((await erc721PenaltyPool.userInfo(user_C.getAddress())).claimed)).to.be.equal(ethers.parseEther("112.672604188336453783"));
        console.log("9th block timestamp:", (await time.latest() - poolStartTime));
    });

    it("Time = 800 seconds after pool was started", async function () {
        await time.increaseTo(await time.latest() + 98);
        await erc721PenaltyPool.connect(user_B).claim();
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("177.596382679105791235"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("26.73"));
        expect(await mockRewardToken.balanceOf(user_B.getAddress())).to.be.equal(ethers.parseEther("229.512703638847803608"));
        expect(((await erc721PenaltyPool.userInfo(user_B.getAddress())).claimed)).to.be.equal(ethers.parseEther("229.512703638847803608"));
        console.log("10th block timestamp:", (await time.latest() - poolStartTime));
    });

    it("Time = 990 seconds after pool was started", async function () {
        await time.increaseTo(await time.latest() + 189);
        await erc721PenaltyPool.connect(user_B).unstake([11, 12, 13, 14, 15, 16, 17]);
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("254.546382679105791234"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("59.850000000000000001"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("78.030000000000000001"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(15);
        console.log("11th block timestamp:", (await time.latest() - poolStartTime));
    });

    it("Time = 998 seconds after pool was started", async function () {
        await time.increaseTo(await time.latest() + 7);
        await erc721PenaltyPool.connect(user_A).unstake([0, 1, 2, 3, 4, 5, 6, 7, 8]);
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("259.298382679105791234"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("59.850000000000000001"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("81.198000000000000001"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(6);
        console.log("12th block timestamp:", (await time.latest() - poolStartTime));
    });

    it("Time = 999 seconds after pool was started", async function () {
        await erc721PenaltyPool.connect(user_A).claim();
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("59.850000000000000001"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("82.188000000000000001"));
        expect(await mockRewardToken.balanceOf(user_A.getAddress())).to.be.equal(ethers.parseEther("385.387393668116780245"));
        expect(((await erc721PenaltyPool.userInfo(user_A.getAddress())).claimed)).to.be.equal(ethers.parseEther("385.387393668116780245"));
        console.log("13th block timestamp:", (await time.latest() - poolStartTime));
    });

    it("Time = 1001 seconds after pool was started", async function () {
        await time.increaseTo(await time.latest() + 1);
        await erc721PenaltyPool.connect(user_B).claim();
        expect(await mockRewardToken.balanceOf(user_B.getAddress())).to.be.equal(ethers.parseEther("289.362703638847803609"));
        expect(((await erc721PenaltyPool.userInfo(user_B.getAddress())).claimed)).to.be.equal(ethers.parseEther("289.362703638847803609"));
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("83.178000000000000001"));
        console.log("14th block timestamp:", (await time.latest() - poolStartTime));
    });

    it("Time = 1100 seconds after pool was started", async function () {
        await time.increaseTo(await time.latest() + 98);
        await erc721PenaltyPool.connect(user_C).claim();
        expect(await mockRewardToken.balanceOf(user_C.getAddress())).to.be.equal(ethers.parseEther("195.850604188336453784"));
        expect(((await erc721PenaltyPool.userInfo(user_C.getAddress())).claimed)).to.be.equal(ethers.parseEther("195.850604188336453784"));
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(6);
        console.log("15th block timestamp:", (await time.latest() - poolStartTime));
    });

    it("Time = 1105 seconds after pool was started", async function () {
        await time.increaseTo(await time.latest() + 4);
        await erc721PenaltyPool.connect(user_C).unstake([24, 25, 26, 27, 28, 29]);
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(0);
        console.log("16th block timestamp:", (await time.latest() - poolStartTime));
    });
});