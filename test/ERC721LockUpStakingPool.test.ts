import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import {
  ERC721LockUpPool,
  ERC721MockToken,
  ERC20MockToken,
  ERC721LockUpStakingFactory,
  ERC721LockUpStakingFactory__factory,
} from "../typechain";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { BytesLike, parseEther } from "ethers";

interface DeploymentParams {
  currentTime: number;
  rewardTokenPerSecond: bigint;
  poolStartTime: number;
  poolEndTime: number;
  unstakeLockUp: number;
  claimLockUp: number;
  adminAddress: string;
  stakeToken: string;
  rewardToken: string;
}
let PRECISION_FACTOR = BigInt(10e18);

describe("ERC721 Lock Up Pool Interaction Tests", async function () {
  let StakingFactory: ERC721LockUpStakingFactory__factory;
  let ercStakingPoolFactory: ERC721LockUpStakingFactory;
  let mockStakeToken: ERC721MockToken;
  let mockRewardToken: ERC20MockToken;
  let rewardTokenPerSecond: bigint;
  let poolStartTime: number;
  let poolEndTime: number;
  let ipfsHash: BytesLike;
  let signer: HardhatEthersSigner;
  let user_A: HardhatEthersSigner;
  let user_B: HardhatEthersSigner;
  let user_C: HardhatEthersSigner;
  let poolContract: ERC721LockUpPool;

  before(async () => {
    StakingFactory = await ethers.getContractFactory(
      "ERC721LockUpStakingFactory"
    );
    ipfsHash = ethers.randomBytes(32);
    ercStakingPoolFactory = await StakingFactory.deploy();
    const blockTimestamp = await time.latest();
    rewardTokenPerSecond = ethers.parseEther("1");
    poolStartTime = blockTimestamp;
    poolEndTime = blockTimestamp;
    [signer, user_A, user_B, user_C] = await ethers.getSigners();

    mockStakeToken = await ethers.deployContract("ERC721MockToken", [
      "StakeToken",
      "STK",
    ]);

    mockRewardToken = await ethers.deployContract("ERC20MockToken", [
      "RewardToken",
      "RTK",
      18,
    ]);
    //First mint stake and reward tokens for user before activating pool

    await mockRewardToken.mint(user_A.address, ethers.parseEther("2000000000"));
  });

  describe("ERC721LockUpStakingPool Deployment", async function () {
    it("Request creation failed: invalid staking token address", async function () {
      poolStartTime += 100;
      poolEndTime = poolStartTime + 120;
      const data = {
        stakeToken: ethers.ZeroAddress,
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime,
        poolEndTime: poolEndTime,
        rewardPerSecond: rewardTokenPerSecond,
        unstakeLockUpTime: poolStartTime + 10,
        claimLockUpTime: poolStartTime + 10,
      };
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      await expect(
        ercStakingPoolFactory.connect(user_A).requestDeployment(ipfsHash, data)
      ).to.be.revertedWithCustomError(
        ercStakingPoolFactory,
        "InvalidTokenAddress"
      );
      let length = (await ercStakingPoolFactory.getRequests()).length;
      expect(lengthBefore).to.be.equal(length);
    });

    it("Request creation failed: invalid reward token addresses", async function () {
      poolStartTime += 100;
      poolEndTime = poolStartTime + 120;
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: ethers.ZeroAddress,
        poolStartTime: poolStartTime,
        poolEndTime: poolEndTime,
        rewardPerSecond: rewardTokenPerSecond,
        unstakeLockUpTime: poolStartTime + 10,
        claimLockUpTime: poolStartTime + 10,
      };
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      await expect(
        ercStakingPoolFactory.connect(user_A).requestDeployment(ipfsHash, data)
      ).to.be.revertedWithCustomError(
        ercStakingPoolFactory,
        "InvalidTokenAddress"
      );
      let length = (await ercStakingPoolFactory.getRequests()).length;
      expect(lengthBefore).to.be.equal(length);
    });

    it("Request should be successfully created", async function () {
      poolStartTime += 200;
      poolEndTime = poolStartTime + 120;
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime,
        poolEndTime: poolEndTime,
        rewardPerSecond: rewardTokenPerSecond,
        unstakeLockUpTime: poolStartTime + 30,
        claimLockUpTime: poolStartTime + 30,
      };
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(
        ercStakingPoolFactory.connect(user_A).requestDeployment(ipfsHash, data)
      )
        .to.emit(ercStakingPoolFactory, "RequestSubmitted")
        .withArgs(length, user_A.address, 1, values);
      length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(length).to.be.equal(1);
      expect(req.info.requestStatus).to.be.equal(1);
      expect(req.info.deployer).to.be.equal(user_A.address);
      expect(req.data).to.be.deep.equal(values);
    });

    it("Request approval failed: invalid caller", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      await expect(
        ercStakingPoolFactory.connect(user_B).approveRequest(length - 1)
      ).to.be.revertedWithCustomError(
        ercStakingPoolFactory,
        "OwnableUnauthorizedAccount"
      );
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(1);
    });

    it("Should correctly approve requested deployment", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      await ercStakingPoolFactory.approveRequest(length - 1);
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(3);
    });

    it("Request approval failed: already approved", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      await expect(
        ercStakingPoolFactory.approveRequest(length - 1)
      ).to.be.revertedWithCustomError(
        ercStakingPoolFactory,
        "InvalidRequestStatus"
      );
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(3);
    });

    it("Request approval failed: invalid id", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      await expect(
        ercStakingPoolFactory.approveRequest(length)
      ).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidId");
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(3);
    });

    it("Deploy failed: invalid caller", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(3);
      await expect(
        ercStakingPoolFactory.connect(user_B).deploy(length - 1)
      ).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidCaller");
    });

    it("Deploy failed: invalid id", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(3);
      await expect(
        ercStakingPoolFactory.connect(user_A).deploy(length + 1)
      ).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidId");
    });

    it("Should correctly deploy pool from APPROVED request", async function () {
      await mockRewardToken
        .connect(user_A)
        .approve(
          await ercStakingPoolFactory.getAddress(),
          parseEther("2000000000")
        );
      let length = (await ercStakingPoolFactory.getRequests()).length;
      await expect(
        ercStakingPoolFactory.connect(user_A).deploy(length - 1)
      ).to.emit(ercStakingPoolFactory, "StakingPoolDeployed");
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(4);
      let poolsLength = (await ercStakingPoolFactory.getPools()).length;
      let lastPool = await ercStakingPoolFactory.stakingPools(poolsLength - 1);
      poolContract = await ethers.getContractAt("ERC721LockUpPool", lastPool);
    });

    it("Request approval failed: already deployed", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      await expect(
        ercStakingPoolFactory.approveRequest(length - 1)
      ).to.be.revertedWithCustomError(
        ercStakingPoolFactory,
        "InvalidRequestStatus"
      );
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(4);
    });

    it("Another requests created with wrong start time", async function () {
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime - 10000,
        poolEndTime: poolStartTime + 120,
        rewardPerSecond: rewardTokenPerSecond,
        unstakeLockUpTime: poolStartTime + 10,
        claimLockUpTime: poolStartTime + 10,
      };
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(
        ercStakingPoolFactory.connect(user_A).requestDeployment(ipfsHash, data)
      )
        .to.emit(ercStakingPoolFactory, "RequestSubmitted")
        .withArgs(lengthBefore, user_A.address, 1, values);
      let length = (await ercStakingPoolFactory.getRequests()).length;
      expect(length).to.be.equal(lengthBefore + 1);

      await ercStakingPoolFactory.approveRequest(length - 1);
      await expect(
        ercStakingPoolFactory.connect(user_A).deploy(length - 1)
      ).to.be.revertedWithCustomError(poolContract, "InvalidStartTime");
      let req = await ercStakingPoolFactory.requests(lengthBefore);
      expect(req.info.requestStatus).to.be.equal(3);
    });

    it("Another requests created with wrong staking period", async function () {
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime + 10000,
        poolEndTime: poolStartTime + 120,
        rewardPerSecond: rewardTokenPerSecond,
        unstakeLockUpTime: poolStartTime + 10,
        claimLockUpTime: poolStartTime + 10,
      };
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(
        ercStakingPoolFactory.connect(user_A).requestDeployment(ipfsHash, data)
      )
        .to.emit(ercStakingPoolFactory, "RequestSubmitted")
        .withArgs(lengthBefore, user_A.address, 1, values);
      let length = (await ercStakingPoolFactory.getRequests()).length;

      expect(length).to.be.equal(lengthBefore + 1);

      await ercStakingPoolFactory.approveRequest(lengthBefore);
      await expect(
        ercStakingPoolFactory.connect(user_A).deploy(lengthBefore)
      ).to.be.revertedWithCustomError(poolContract, "InvalidStakingPeriod");
      let req = await ercStakingPoolFactory.requests(lengthBefore);
      expect(req.info.requestStatus).to.be.equal(3);
    });

    it("Another requests created with wrong unstake LockUp time", async function () {
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime + 100,
        poolEndTime: poolStartTime + 120,
        rewardPerSecond: rewardTokenPerSecond,
        unstakeLockUpTime: poolEndTime + 130,
        claimLockUpTime: poolStartTime + 10,
      };
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(
        ercStakingPoolFactory.connect(user_A).requestDeployment(ipfsHash, data)
      )
        .to.emit(ercStakingPoolFactory, "RequestSubmitted")
        .withArgs(lengthBefore, user_A.address, 1, values);
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(lengthBefore);
      expect(length).to.be.equal(lengthBefore + 1);
      expect(req.info.requestStatus).to.be.equal(1);
      await ercStakingPoolFactory.approveRequest(length - 1);
      await expect(
        ercStakingPoolFactory.connect(user_A).deploy(lengthBefore)
      ).to.be.revertedWithCustomError(poolContract, "InvalidLockUpTime");
    });

    it("Another requests created with wrong claim LockUp time", async function () {
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime + 100,
        poolEndTime: poolStartTime + 120,
        rewardPerSecond: rewardTokenPerSecond,
        unstakeLockUpTime: poolStartTime + 10,
        claimLockUpTime: poolEndTime + 10,
      };
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(
        ercStakingPoolFactory.connect(user_A).requestDeployment(ipfsHash, data)
      )
        .to.emit(ercStakingPoolFactory, "RequestSubmitted")
        .withArgs(lengthBefore, user_A.address, 1, values);
      await ercStakingPoolFactory.approveRequest(lengthBefore);
      await expect(
        ercStakingPoolFactory.connect(user_A).deploy(lengthBefore)
      ).to.be.revertedWithCustomError(poolContract, "InvalidLockUpTime");
    });

    it("Cancel last approved request failed: caller is not an owner", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(3);
      await expect(
        ercStakingPoolFactory.cancelRequest(length - 1)
      ).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidCaller");
    });

    it("Cancel last approved request failed: invalid id", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(3);
      await expect(
        ercStakingPoolFactory.connect(user_A).cancelRequest(length + 1)
      ).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidId");
    });

    it("Cancel last approved request", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(3);
      await expect(
        ercStakingPoolFactory.connect(user_A).cancelRequest(length - 1)
      ).to.be.emit(ercStakingPoolFactory, "RequestStatusChanged");
      req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(5);
    });

    it("Cancel last approved request failed: already canceled", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(5);
      await expect(
        ercStakingPoolFactory.connect(user_A).cancelRequest(length - 1)
      ).to.be.revertedWithCustomError(
        ercStakingPoolFactory,
        "InvalidRequestStatus"
      );
    });

    it("Another request created", async function () {
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime + 100,
        poolEndTime: poolStartTime + 120,
        rewardPerSecond: 0,
        unstakeLockUpTime: poolStartTime + 10,
        claimLockUpTime: poolStartTime + 10,
      };
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(
        ercStakingPoolFactory.connect(user_A).requestDeployment(ipfsHash, data)
      )
        .to.emit(ercStakingPoolFactory, "RequestSubmitted")
        .withArgs(lengthBefore, user_A.address, 1, values);
    });

    it("Deploy failed: request was not approved", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(1);
      await expect(
        ercStakingPoolFactory.connect(user_A).deploy(length - 1)
      ).to.be.revertedWithCustomError(
        ercStakingPoolFactory,
        "InvalidRequestStatus"
      );
    });

    it("Deny last submitted request with wrong data failed: invalid caller", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(1);
      await expect(
        ercStakingPoolFactory.connect(user_A).denyRequest(length - 1)
      ).to.be.revertedWithCustomError(
        ercStakingPoolFactory,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Deny last submitted request with wrong data failed: invalid id", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(1);
      await expect(
        ercStakingPoolFactory.denyRequest(length)
      ).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidId");
    });

    it("Deny last submitted request with wrong data", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(1);
      await expect(ercStakingPoolFactory.denyRequest(length - 1))
        .to.emit(ercStakingPoolFactory, "RequestStatusChanged")
        .withArgs(length - 1, 2);
    });

    it("Deny failed: already denied", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(2);
      await expect(
        ercStakingPoolFactory.denyRequest(length)
      ).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidId");
    });
  });
  describe("ERC721 Pool Interactions", async function () {
    before(async function () {
      var users = [user_A, user_B, user_C];
      // Mint tokens and set approval for each user
      for (const user of users) {
        for (let i = 0; i < 10; i++) {
          await mockStakeToken.safeMint(user.address);
        }
        await mockStakeToken
          .connect(user)
          .setApprovalForAll(await poolContract.getAddress(), true);
      }
    });
    it("Stake fail: (PoolNotStarted)", async function () {
      await expect(poolContract.stake([0])).revertedWithCustomError(
        poolContract,
        "PoolNotStarted"
      );
    });
    it("Stake fail: (InvalidAmount)", async function () {
      await time.increaseTo(poolStartTime);
      await expect(
        poolContract.connect(user_A).stake([])
      ).revertedWithCustomError(poolContract, "InvalidAmount");
    });
    it("Stake: Expect Emit (Stake)", async function () {
      //Stake
      var tokenIds = [0, 1];
      var address = user_A.address;
      await expect(poolContract.connect(user_A).stake(tokenIds))
        .emit(poolContract, "Stake");
      expect((await poolContract.pool()).totalStaked).to.equal(tokenIds.length)
    });

    it("Unstake failed: tokens in lockup", async function () {
      await expect(
        poolContract.connect(user_A).unstake([0])
      ).to.be.revertedWithCustomError(poolContract, "TokensInLockUp");
    });

    it("Claim failed: tokens in lockup", async function () {
      await time.increase(5);
      await expect(
        poolContract.connect(user_A).claim()
      ).to.be.revertedWithCustomError(poolContract, "TokensInLockUp");
    });

    it("Unstake: Expect Unstake Emit", async function () {
      await time.increase(25);
      let totalStaked = (await poolContract.pool()).totalStaked;
      await expect(poolContract.connect(user_A).unstake([0]))
        .emit(poolContract, "Unstake");
      expect((await poolContract.pool()).totalStaked).to.equal(
        totalStaked - BigInt(1)
      );
    });
    it("Claim Rewards: Reward Token balance should increase by amount claimed", async function () {
      let initialBalance = await mockRewardToken.balanceOf(user_A.address)
      await expect(poolContract.connect(user_A).claim()).emit(poolContract, "Claim");
      let newBalance = await mockRewardToken.balanceOf(user_A.address)
      expect(newBalance).to.be.equal(initialBalance + (await poolContract.userInfo(user_A.getAddress())).claimed)
    })
    it("New user stakes", async function () {
      let initialTotalStaked = (await poolContract.pool()).totalStaked;
      await expect(poolContract.connect(user_B).stake([10, 11])).emit(poolContract, "Stake");
      expect((await poolContract.pool()).totalStaked).to.be.equal(initialTotalStaked + BigInt(2))
    });
    it("Unstake failed: Invalid amount", async function () {
      await expect(poolContract.connect(user_B).unstake([])).revertedWithCustomError(poolContract, "InvalidAmount");
    });

    it("Unstake failed: Attempt to unstake more than staked", async function () {
      await expect(poolContract.connect(user_B).unstake([10, 11, 12, 13])).revertedWithCustomError(poolContract, "InsufficientAmount");
    });
    it("Claim failed: User have nothing to claim right after he has already claimed and ustaked", async function () {
      await expect(poolContract.connect(user_B).unstake([10, 11])).emit(poolContract, "Unstake");
      await poolContract.connect(user_B).claim();
      await expect(poolContract.connect(user_B).claim()).revertedWithCustomError(poolContract, "NothingToClaim");
    });
    it("Stake fail: pool is over)", async function () {
      await time.increaseTo(poolEndTime);
      await expect(poolContract.connect(user_B).stake([12, 13])).revertedWithCustomError(
        poolContract,
        "PoolHasEnded"
      );
    });
  });
});
