import { expect } from "chai";
import { ethers, network } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
    ERC721LockUpPool,
    ERC20MockToken,
    ERC721MockToken,
    ERC721LockUpStakingFactory,
} from "../typechain";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("erc721LockUpPool Standard Scenario", async function () {
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

    it("Handles ERC721NoLockupPool deployment", async function () {
        // Set pool parameters
        let ipfsHash = ethers.randomBytes(32);
        const data = {
            stakeToken: await mockStakeToken.getAddress(),
            rewardToken: await mockRewardToken.getAddress(),
            poolStartTime: poolStartTime,
            poolEndTime: poolStartTime + 1000,
            rewardPerSecond: ethers.parseEther("1"),
            unstakeLockUpTime: 0,
            claimLockUpTime: 0
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

    it("Handles erc721LockUpPool reward calculation scenario", async function () {

        let poolInfo = await erc721LockUpPool.pool();
        // --- Initial Staking (Time = 10 seconds after pool was started)
        await time.increaseTo(poolInfo.startTime + 9n);
        await erc721LockUpPool.connect(user_A).stake([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(10);
        console.log("1st block timestamp:", (await time.latest() - poolStartTime));

        // Time = 50 seconds after pool was started
        await time.increaseTo(await time.latest() + 39);
        await erc721LockUpPool.connect(user_B).stake([10, 11, 12, 13, 14]);
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("40"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(15);
        console.log("2nd block timestamp:", (await time.latest() - poolStartTime));

        // Time = 200 seconds after pool was started
        await time.increaseTo(await time.latest() + 149);
        await erc721LockUpPool.connect(user_B).stake([15, 16, 17, 18, 19]);
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("140"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("50"));
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(20);
        console.log("3rd block timestamp:", (await time.latest() - poolStartTime));

        // Time = 250 seconds after pool was started
        await time.increaseTo(await time.latest() + 50);
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("165"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("75"));
        console.log("4th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 300 seconds after pool was started
        await time.increaseTo(await time.latest() + 50);
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("190"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("100"));
        console.log("5th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 301 seconds after pool was started
        await erc721LockUpPool.connect(user_A).claim();
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("100.5"));
        expect(await mockRewardToken.balanceOf(user_A.getAddress())).to.be.equal(ethers.parseEther("190.5"));
        expect(((await erc721LockUpPool.userInfo(user_A.getAddress())).claimed)).to.be.equal(ethers.parseEther("190.5"));
        console.log("6th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 500 seconds after pool was started
        await time.increaseTo(await time.latest() + 199);
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("99.5"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("200"));
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(20);
        console.log("7th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 700 seconds after pool was started
        await time.increaseTo(await time.latest() + 199);
        await erc721LockUpPool.connect(user_B).unstake([17, 18, 19]);
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("199.5"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("300"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(17);
        console.log("8th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 701 seconds after pool was started
        await erc721LockUpPool.connect(user_C).stake([20, 21, 22, 23]);
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("200.088235294117647058"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("300.411764705882352941"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(21);
        console.log("9th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 800 seconds after pool was started
        await time.increaseTo(await time.latest() + 98);
        await erc721LockUpPool.connect(user_B).claim();
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("247.231092436974789915"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("18.857142857142857143"));
        expect(await mockRewardToken.balanceOf(user_B.getAddress())).to.be.equal(ethers.parseEther("333.411764705882352941"));
        expect(((await erc721LockUpPool.userInfo(user_B.getAddress())).claimed)).to.be.equal(ethers.parseEther("333.411764705882352941"));
        console.log("10th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 990 seconds after pool was started
        await time.increaseTo(await time.latest() + 189);
        await erc721LockUpPool.connect(user_A).unstake([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("337.707282913165266106"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("63.333333333333333333"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("55.047619047619047619"));
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(11);
        console.log("11th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 998 seconds after pool was started
        await time.increaseTo(await time.latest() + 7);
        await erc721LockUpPool.connect(user_A).claim();
        expect(await mockRewardToken.balanceOf(user_A.getAddress())).to.be.equal(ethers.parseEther("528.207282913165266106"));
        expect(((await erc721LockUpPool.userInfo(user_A.getAddress())).claimed)).to.be.equal(ethers.parseEther("528.207282913165266106"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("68.424242424242424242"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("57.956709956709956710"));
        console.log("12th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 999 seconds after pool was started
        await erc721LockUpPool.connect(user_B).unstake([13, 14, 15, 16]);
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("69.060606060606060606"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("58.320346320346320346"));
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(7);
        console.log("13th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 1001 seconds after pool was started
        await time.increaseTo(await time.latest() + 1);
        await network.provider.send("evm_setAutomine", [false]);
        await erc721LockUpPool.connect(user_C).unstake([20, 21, 22, 23]);
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("69.489177489177489177"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("58.891774891774891775"));

        await erc721LockUpPool.connect(user_B).claim();
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("58.891774891774891775"));
        expect(await mockRewardToken.balanceOf(user_B.getAddress())).to.be.equal(ethers.parseEther("333.411764705882352941"));
        expect(((await erc721LockUpPool.userInfo(user_B.getAddress())).claimed)).to.be.equal(ethers.parseEther("333.411764705882352941"));
        await network.provider.send("evm_setAutomine", [true]);
        console.log("14th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 1100 seconds after pool was started
        await time.increaseTo(await time.latest() + 98);
        await erc721LockUpPool.connect(user_C).claim();
        expect(await mockRewardToken.balanceOf(user_C.getAddress())).to.be.equal(ethers.parseEther("58.891774891774891775"));
        expect(((await erc721LockUpPool.userInfo(user_C.getAddress())).claimed)).to.be.equal(ethers.parseEther("58.891774891774891775"));
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(3);
        console.log("15th block timestamp:", (await time.latest() - poolStartTime));

        // Time = 1105 seconds after pool was started
        await time.increaseTo(await time.latest() + 5);
        await erc721LockUpPool.connect(user_B).unstake([10, 11, 12]);
        expect(await erc721LockUpPool.pendingRewards(user_A.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721LockUpPool.pendingRewards(user_B.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect(await erc721LockUpPool.pendingRewards(user_C.getAddress())).to.be.equal(ethers.parseEther("0"));
        expect((await erc721LockUpPool.pool()).totalStaked).to.be.equal(0);
        console.log("16th block timestamp:", (await time.latest() - poolStartTime));

    });
});