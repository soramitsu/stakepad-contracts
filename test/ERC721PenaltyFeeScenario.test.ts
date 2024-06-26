import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
    ERC721PenaltyFeePool,
    ERC20MockToken,
    ERC721MockToken,
    ERC721PenaltyFeeStakingFactory,
} from "../typechain";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ERC721PenaltyPool Standard Scenario", async function () {
    let mockStakeToken: ERC721MockToken;
    let mockRewardToken: ERC20MockToken;
    let erc721PenaltyFactory: ERC721PenaltyFeeStakingFactory;
    let erc721PenaltyPool: ERC721PenaltyFeePool;
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
        erc721PenaltyFactory = await ERC721PenaltyStakingFactory.deploy();

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

        // Create deployment request
        await erc721PenaltyFactory.connect(deployer).requestDeployment(ipfsHash, data);
        // Approve and deploy the request
        await erc721PenaltyFactory.approveRequest(0);
        // Deploy approved request
        await mockRewardToken.connect(deployer).approve(erc721PenaltyFactory.getAddress(), ethers.parseEther("1000"));
        await erc721PenaltyFactory.connect(deployer).deploy(0);

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

    it("Handles ERC20PenaltyFeePool reward calculation scenario", async function () {
        let poolInfo = await erc721PenaltyPool.pool();
        // --- Initial Staking (Time = 10 seconds after pool was started)
        await time.increaseTo(poolInfo.startTime + 9n);
        await erc721PenaltyPool.connect(user_A).stake([0, 1, 2, 3, 4, 5]);
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(6);
        console.log("1st block timestamp:", (await time.latest() - poolStartTime));

        // Time = 50 seconds after pool was started
        await time.increaseTo(await time.latest() + 39);
        await erc721PenaltyPool.connect(user_B).stake([10, 11, 12, 13, 14, 15, 16, 17]);
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("39.6"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(14);
        console.log("2nd block timestamp:", (await time.latest() - poolStartTime));

        // Time = 200 seconds after pool was started
        await time.increaseTo(await time.latest() + 149);
        await erc721PenaltyPool.connect(user_B).unstake([10]);
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("103.242857142857142857"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("84.857142857142857144"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(13);
        console.log("3rd block timestamp:", (await time.latest() - poolStartTime));

        // Time = 250 seconds after pool was started
        await time.increaseTo(await time.latest() + 49);
        await erc721PenaltyPool.connect(user_A).claim();
        expect(await mockRewardToken.balanceOf(user_A.getAddress())).to.be.equal(ethers.parseEther("126.089010989010989011"));
        expect(((await erc721PenaltyPool.userInfo(user_A.getAddress())).claimed)).to.be.equal(ethers.parseEther("126.089010989010989011"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("111.51098901098901099"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
        console.log("4th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 300 seconds after pool was started
        await time.increaseTo(await time.latest() + 49);
        await erc721PenaltyPool.connect(user_C).stake([20, 21, 22, 23, 24]);
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("22.846153846153846154"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("138.164835164835164836"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(18);
        console.log("5th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 301 seconds after pool was started
        await erc721PenaltyPool.connect(user_C).stake([25, 26, 27, 28, 29]);
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("23.176153846153846154"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("138.549835164835164836"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0.275000000000000001"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(23);
        console.log("6th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 500 seconds after pool was started
        await time.increaseTo(await time.latest() + 198);
        await erc721PenaltyPool.connect(user_C).unstake([20, 21, 22, 23]);
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("74.570066889632107023"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("198.509400382226469184"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("85.931521739130434783"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(19);
        console.log("7th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 700 seconds after pool was started
        await time.increaseTo(await time.latest() + 199);
        await erc721PenaltyPool.connect(user_A).stake([6, 7, 8]);
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("137.096382679105791235"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("271.456768803279100763"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("148.457837528604118994"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(22);
        console.log("8th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 701 seconds after pool was started
        await erc721PenaltyPool.connect(user_C).claim();
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("137.501382679105791235"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("271.771768803279100762"));

        expect(await mockRewardToken.balanceOf(user_C.getAddress())).to.be.equal(ethers.parseEther("148.727837528604118994"));
        expect(((await erc721PenaltyPool.userInfo(user_C.getAddress())).claimed)).to.be.equal(ethers.parseEther("148.727837528604118994"));
        console.log("9th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 800 seconds after pool was started
        await time.increaseTo(await time.latest() + 98);
        await erc721PenaltyPool.connect(user_B).claim();
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("177.596382679105791235"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("26.73"));
        expect(await mockRewardToken.balanceOf(user_B.getAddress())).to.be.equal(ethers.parseEther("302.956768803279100762"));
        expect(((await erc721PenaltyPool.userInfo(user_B.getAddress())).claimed)).to.be.equal(ethers.parseEther("302.956768803279100762"));
        console.log("10th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 990 seconds after pool was started
        await time.increaseTo(await time.latest() + 189);
        await erc721PenaltyPool.connect(user_B).unstake([11, 12, 13, 14, 15, 16, 17]);
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("254.546382679105791234"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("59.850000000000000001"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("78.030000000000000001"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(15);
        console.log("11th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 998 seconds after pool was started
        await time.increaseTo(await time.latest() + 7);
        await erc721PenaltyPool.connect(user_A).unstake([0, 1, 2, 3, 4, 5, 6, 7, 8]);
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("259.298382679105791234"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("59.850000000000000001"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("81.198000000000000001"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(6);
        console.log("12th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 999 seconds after pool was started
        await erc721PenaltyPool.connect(user_A).claim();
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("59.850000000000000001"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("82.188000000000000001"));
        expect(await mockRewardToken.balanceOf(user_A.getAddress())).to.be.equal(ethers.parseEther("385.387393668116780245"));
        expect(((await erc721PenaltyPool.userInfo(user_A.getAddress())).claimed)).to.be.equal(ethers.parseEther("385.387393668116780245"));
        console.log("13th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 1001 seconds after pool was started
        await time.increaseTo(await time.latest() + 1);
        await erc721PenaltyPool.connect(user_B).claim();
        expect(await mockRewardToken.balanceOf(user_B.getAddress())).to.be.equal(ethers.parseEther("362.806768803279100763"));
        expect(((await erc721PenaltyPool.userInfo(user_B.getAddress())).claimed)).to.be.equal(ethers.parseEther("362.806768803279100763"));
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("83.178000000000000001"));
        console.log("14th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 1100 seconds after pool was started
        await time.increaseTo(await time.latest() + 98);
        await erc721PenaltyPool.connect(user_C).claim();
        expect(await mockRewardToken.balanceOf(user_C.getAddress())).to.be.equal(ethers.parseEther("231.905837528604118995"));
        expect(((await erc721PenaltyPool.userInfo(user_C.getAddress())).claimed)).to.be.equal(ethers.parseEther("231.905837528604118995"));
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(6);
        console.log("15th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 1105 seconds after pool was started
        await time.increaseTo(await time.latest() + 4);
        await erc721PenaltyPool.connect(user_C).unstake([24, 25, 26, 27, 28, 29]);
        expect(await erc721PenaltyPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721PenaltyPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721PenaltyPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc721PenaltyPool.pool()).totalStaked).to.be.equal(0);
        console.log("16th block timestamp:", (await time.latest() - poolStartTime));
    });
});