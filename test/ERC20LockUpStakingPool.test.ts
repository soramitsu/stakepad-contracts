import { expect } from "chai";
import { ethers } from "hardhat";
import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-network-helpers";
import {
  ERC20LockUpPool,
  ERC20MockToken,
  ERC20LockUpStakingFactory,
  ERC20LockUpStakingFactory__factory,
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

describe("Contract Deployment", async function () {
  let StakingFactory: ERC20LockUpStakingFactory__factory;
  let ercStakingPoolFactory: ERC20LockUpStakingFactory;
  let mockStakeToken: ERC20MockToken;
  let mockRewardToken: ERC20MockToken;
  let rewardTokenPerSecond: bigint;
  let poolStartTime: number;
  let poolEndTime: number;
  let ipfsHash: BytesLike;
  let signer: HardhatEthersSigner;
  let user_A: HardhatEthersSigner;
  let user_B: HardhatEthersSigner;
  let user_C: HardhatEthersSigner;
  let poolContract: ERC20LockUpPool;

  before(async () => {
    StakingFactory = await ethers.getContractFactory(
      "ERC20LockUpStakingFactory"
    );
    ipfsHash = ethers.randomBytes(32);
    ercStakingPoolFactory = await StakingFactory.deploy();
    const blockTimestamp = await time.latest();
    rewardTokenPerSecond = ethers.parseEther("1");
    poolStartTime = blockTimestamp;
    poolEndTime = blockTimestamp;
    [signer, user_A, user_B, user_C] = await ethers.getSigners();

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

    await mockStakeToken.transfer(
      user_A.address,
      ethers.parseEther("10000")
    );

    await mockStakeToken.transfer(user_B.address, ethers.parseEther("10000"));
    await mockStakeToken.transfer(user_C.address, ethers.parseEther("10000"));

    await mockRewardToken.mint(
      user_A.address,
      ethers.parseEther("2000000000")
    );
  });

  describe("ERC20LockUpStakingPool Deployment", async function () {
    it("Request creation failed: invalid staking token address", async function () {
      poolStartTime += 100;
      poolEndTime = poolStartTime + 120;
      const data = {
        stakeToken: ethers.ZeroAddress,
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime,
        poolEndTime: poolEndTime,
        unstakeLockUpTime: poolStartTime + 10,
        claimLockUpTime: poolStartTime + 10,
        rewardPerSecond: rewardTokenPerSecond
      }
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.connect(user_A).requestDeployment(ipfsHash, data)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidTokenAddress");
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
        unstakeLockUpTime: poolStartTime + 10,
        claimLockUpTime: poolStartTime + 10,
        rewardPerSecond: rewardTokenPerSecond
      }
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.connect(user_A).requestDeployment(ipfsHash, data)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidTokenAddress");
      let length = (await ercStakingPoolFactory.getRequests()).length;
      expect(lengthBefore).to.be.equal(length);
    });

    it("Request creation failed: invalid reward token addresses", async function () {
      poolStartTime += 100;
      poolEndTime = poolStartTime + 120;
      const data = {
        stakeToken: ethers.ZeroAddress,
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime,
        poolEndTime: poolEndTime,
        unstakeLockUpTime: poolStartTime + 10,
        claimLockUpTime: poolStartTime + 10,
        rewardPerSecond: ethers.toBigInt(0)
      }
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.connect(user_A).requestDeployment(ipfsHash, data)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidTokenAddress");
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
        unstakeLockUpTime: poolStartTime + 30,
        claimLockUpTime: poolStartTime + 30,
        rewardPerSecond: rewardTokenPerSecond
      }
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(ercStakingPoolFactory.connect(user_A).requestDeployment(ipfsHash, data)).to.emit(ercStakingPoolFactory, "RequestSubmitted").withArgs(length, user_A.address, 1, values);
      length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(length).to.be.equal(1);
      expect(req.info.requestStatus).to.be.equal(1);
      expect(req.info.deployer).to.be.equal(user_A.address);
      expect(req.data).to.be.deep.equal(values);
    });

    it("Request approval failed: invalid caller", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.connect(user_A).approveRequest(length - 1)).to.be.revertedWithCustomError(ercStakingPoolFactory, "OwnableUnauthorizedAccount");
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
      await expect(ercStakingPoolFactory.approveRequest(length - 1)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidRequestStatus");
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(3);
    });

    it("Request approval failed: invalid id", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.approveRequest(length)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidId");
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(3);
    });

    it("Deploy failed: invalid caller", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(3);
      await expect(ercStakingPoolFactory.connect(user_B).deploy(length - 1)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidCaller");
    });

    it("Deploy failed: invalid id", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(3);
      await expect(ercStakingPoolFactory.connect(user_A).deploy(length)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidId");
    });

    it("Should correctly deploy pool from APPROVED request", async function () {
      await mockRewardToken
        .connect(user_A)
        .approve(
          await ercStakingPoolFactory.getAddress(),
          parseEther("2000000000")
        );
      let length = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.connect(user_A).deploy(length - 1)).to.emit(ercStakingPoolFactory, "StakingPoolDeployed");
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(4);
      let poolsLength = (await ercStakingPoolFactory.getPools()).length;
      let lastPool = await ercStakingPoolFactory.stakingPools(poolsLength - 1);
      poolContract = await ethers.getContractAt(
        "ERC20LockUpPool",
        lastPool
      );
    });

    it("Request approval failed: already deployed", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.approveRequest(length - 1)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidRequestStatus");
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(4);
    });

    it("Another requests created with wrong start time", async function () {
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime - 10000,
        poolEndTime: poolStartTime + 120,
        unstakeLockUpTime: poolStartTime + 10,
        claimLockUpTime: poolStartTime + 10,
        rewardPerSecond: rewardTokenPerSecond,
      };
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(ercStakingPoolFactory.connect(user_A).requestDeployment(ipfsHash, data)).to.emit(ercStakingPoolFactory, "RequestSubmitted").withArgs(lengthBefore, user_A.address, 1, values);
      let length = (await ercStakingPoolFactory.getRequests()).length;
      expect(length).to.be.equal(lengthBefore + 1);

      await ercStakingPoolFactory.approveRequest(length - 1);
      await expect(ercStakingPoolFactory.connect(user_A).deploy(length - 1)).to.be.revertedWithCustomError(poolContract, "InvalidStartTime");
      let req = await ercStakingPoolFactory.requests(lengthBefore);
      expect(req.info.requestStatus).to.be.equal(3);
    });

    it("Another requests created with wrong staking period", async function () {
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime + 10000,
        poolEndTime: poolStartTime + 120,
        unstakeLockUpTime: poolStartTime + 10,
        claimLockUpTime: poolStartTime + 10,
        rewardPerSecond: rewardTokenPerSecond
      };
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(ercStakingPoolFactory.connect(user_A).requestDeployment(ipfsHash, data)).to.emit(ercStakingPoolFactory, "RequestSubmitted").withArgs(lengthBefore, user_A.address, 1, values);
      let length = (await ercStakingPoolFactory.getRequests()).length;

      expect(length).to.be.equal(lengthBefore + 1);

      await ercStakingPoolFactory.approveRequest(lengthBefore);
      await expect(ercStakingPoolFactory.connect(user_A).deploy(lengthBefore)).to.be.revertedWithCustomError(poolContract, "InvalidStakingPeriod");
      let req = await ercStakingPoolFactory.requests(lengthBefore);
      expect(req.info.requestStatus).to.be.equal(3);
    });

    it("Another requests created with wrong unstake LockUp time", async function () {
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime + 100,
        poolEndTime: poolStartTime + 120,
        unstakeLockUpTime: poolEndTime + 130,
        claimLockUpTime: poolStartTime + 10,
        rewardPerSecond: rewardTokenPerSecond,
      };
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(ercStakingPoolFactory.connect(user_A).requestDeployment(ipfsHash, data)).to.emit(ercStakingPoolFactory, "RequestSubmitted").withArgs(lengthBefore, user_A.address, 1, values);
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(lengthBefore);
      expect(length).to.be.equal(lengthBefore + 1);
      expect(req.info.requestStatus).to.be.equal(1);
      await ercStakingPoolFactory.approveRequest(length - 1);
      await expect(ercStakingPoolFactory.connect(user_A).deploy(lengthBefore)).to.be.revertedWithCustomError(poolContract, "InvalidLockUpTime");
    });

    it("Another requests created with wrong claim LockUp time", async function () {
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime + 100,
        poolEndTime: poolStartTime + 120,
        unstakeLockUpTime: poolStartTime + 10,
        claimLockUpTime: poolEndTime + 10,
        rewardPerSecond: rewardTokenPerSecond
      };
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(ercStakingPoolFactory.connect(user_A).requestDeployment(ipfsHash, data)).to.emit(ercStakingPoolFactory, "RequestSubmitted").withArgs(lengthBefore, user_A.address, 1, values);
      await ercStakingPoolFactory.approveRequest(lengthBefore);
      await expect(ercStakingPoolFactory.connect(user_A).deploy(lengthBefore)).to.be.revertedWithCustomError(poolContract, "InvalidLockUpTime");
    });

    it("Cancel last approved request failed: caller is not an owner", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(3);
      await expect(ercStakingPoolFactory.cancelRequest(length - 1)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidCaller");
    });

    it("Cancel last approved request failed: invalid id", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(3);
      await expect(ercStakingPoolFactory.connect(user_A).cancelRequest(length + 1)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidId");
    });

    it("Cancel last approved request", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(3);
      await expect(ercStakingPoolFactory.connect(user_A).cancelRequest(length - 1)).to.be.emit(ercStakingPoolFactory, "RequestStatusChanged");
      req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(5);
    });

    it("Cancel last approved request failed: already canceled", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(5);
      await expect(ercStakingPoolFactory.connect(user_A).cancelRequest(length - 1)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidRequestStatus");
    });

    it("Another request created with wrong reward rate", async function () {
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime + 100,
        poolEndTime: poolStartTime + 120,
        unstakeLockUpTime: poolStartTime + 10,
        claimLockUpTime: poolStartTime + 10,
        rewardPerSecond: 0
      };
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(ercStakingPoolFactory.connect(user_A).requestDeployment(ipfsHash, data)).to.emit(ercStakingPoolFactory, "RequestSubmitted").withArgs(lengthBefore, user_A.address, 1, values);
      await ercStakingPoolFactory.approveRequest(lengthBefore);
      await expect(ercStakingPoolFactory.connect(user_A).deploy(lengthBefore)).to.be.revertedWithCustomError(poolContract, "InvalidRewardRate");
    });

    it("Another request created", async function () {
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime + 100,
        poolEndTime: poolStartTime + 120,
        unstakeLockUpTime: poolStartTime + 10,
        claimLockUpTime: poolStartTime + 10,
        rewardPerSecond: 0
      };
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(ercStakingPoolFactory.connect(user_A).requestDeployment(ipfsHash, data)).to.emit(ercStakingPoolFactory, "RequestSubmitted").withArgs(lengthBefore, user_A.address, 1, values);
    });

    it("Deploy failed: request was not approved", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(1);
      await expect(ercStakingPoolFactory.connect(user_A).deploy(length - 1)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidRequestStatus");
    });

    it("Deny last submitted request with wrong data failed: invalid caller", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(1);
      await expect(ercStakingPoolFactory.connect(user_A).denyRequest(length - 1)).to.be.revertedWithCustomError(ercStakingPoolFactory, "OwnableUnauthorizedAccount");
    });

    it("Deny last submitted request with wrong data failed: invalid id", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(1);
      await expect(ercStakingPoolFactory.denyRequest(length)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidId");
    });

    it("Deny last submitted request with wrong data", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(1);
      await expect(ercStakingPoolFactory.denyRequest(length - 1)).to.emit(ercStakingPoolFactory, "RequestStatusChanged").withArgs(length - 1, 2);
    });

    it("Deny failed: already denied", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(2);
      await expect(ercStakingPoolFactory.denyRequest(length)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidId");
    });

  })
  describe("Pool Interactions", async function () {
    it("Stake fail: (PoolNotStarted)", async function () {
      await expect(
        poolContract.stake(ethers.parseEther("100"))
      ).revertedWithCustomError(poolContract, "PoolNotStarted");
    });

    it("Stake fail: (InvalidAmount)", async function () {
      await time.increaseTo(poolStartTime);
      let amount = ethers.parseEther("0");
      await expect(poolContract.stake(amount)).revertedWithCustomError(
        poolContract,
        "InvalidAmount"
      );
    });

    it("Stake: Expect Emit (Stake)", async function () {
      let amount = ethers.parseEther("100");
      //Approve user to transfer tokens
      await mockStakeToken
        .connect(user_A)
        .approve(
          poolContract.getAddress(),
          amount
        );

      //Stake
      await expect(poolContract.connect(user_A).stake(amount)).emit(
        poolContract,
        "Stake"
      ).withArgs(user_A.address, amount);
      expect((await poolContract.pool()).totalStaked).to.equal(amount);
    });

    it("Unstake failed: tokens in lockup", async function () {
      let amount = ethers.parseEther("50");
      await expect(
        poolContract.connect(user_A).unstake(amount)
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
      let amount = ethers.parseEther("100");
      let totalStaked = (await poolContract.pool()).totalStaked
      await expect(
        poolContract.connect(user_A).unstake(amount)
      ).emit(poolContract, "Unstake").withArgs(user_A.address, amount);
      expect((await poolContract.pool()).totalStaked).to.equal(totalStaked - amount);
    });

    it("Pending Rewards", async function () {
      console.log("Current Time:", await time.latest());
      expect(await poolContract.pendingRewards(user_A.address)).to.be.equal(ethers.parseEther("33"));
      // Reward are the same within the same block
      expect(await poolContract.pendingRewards(user_A.address)).to.be.equal(ethers.parseEther("33"));
    })

    it("Claim Rewards: Reward Token balance should increase by amount claimed", async function () {
      let initialBalance = await mockRewardToken.balanceOf(user_A.address)
      await expect(poolContract.connect(user_A).claim()).emit(poolContract, "Claim");
      let newBalance = await mockRewardToken.balanceOf(user_A.address)
      expect(newBalance).to.be.equal(initialBalance + (await poolContract.userInfo(user_A.getAddress())).claimed)
    })

    it("New user stakes", async function () {
      let initialTotalStaked = (await poolContract.pool()).totalStaked;
      await mockStakeToken.connect(user_B).approve(poolContract.getAddress(), ethers.parseEther("10000"))
      await expect(poolContract.connect(user_B).stake(ethers.parseEther("100"))).emit(poolContract, "Stake").withArgs(user_B.address, ethers.parseEther("100"));
      expect((await poolContract.pool()).totalStaked).to.be.greaterThan(initialTotalStaked)
    });

    it("Unstake failed: Invalid amount", async function () {
      await expect(poolContract.connect(user_B).unstake(0)).revertedWithCustomError(poolContract, "InvalidAmount");
    });

    it("Unstake failed: Attempt to unstake more than staked", async function () {
      await expect(poolContract.connect(user_B).unstake(ethers.parseEther("10000"))).revertedWithCustomError(poolContract, "InsufficientAmount");
    });

    it("Should correctly calculate rewards and match pendingRewards()", async function () {
      // Calculate rewards outside the contract (emulating pendingRewards logic)
      let user_AUser = await poolContract.userInfo(user_A.address);
      const currentTimestamp = await time.latest();

      const pendingRewards = await poolContract.pendingRewards(user_A.address);
      let accRewardPerShare = (await poolContract.pool()).accRewardPerShare;

      let stakingPool = await poolContract.pool()
      if (currentTimestamp > stakingPool.lastUpdateTimestamp && stakingPool.totalStaked !== BigInt(0)) {
        const elapsedPeriod = BigInt(currentTimestamp) - stakingPool.lastUpdateTimestamp;
        const totalNewReward = stakingPool.rewardTokenPerSecond * elapsedPeriod;
        accRewardPerShare += (totalNewReward * PRECISION_FACTOR) / stakingPool.totalStaked;
      }

      const calculatedRewards = ((user_AUser.amount * accRewardPerShare) / PRECISION_FACTOR) - user_AUser.rewardDebt;
      // Compare with the output of pendingRewards()
      console.log("Calculated rewards: " + calculatedRewards, "Pending Rewards: " + pendingRewards)
      expect(calculatedRewards).to.be.closeTo(pendingRewards, ethers.parseEther("0.1")); // Adjust if needed
    });

    it("Claim failed: User have nothing to claim right after he has already claimed and ustaked", async function () {
      await expect(poolContract.connect(user_B).unstake(ethers.parseEther("100"))).emit(poolContract, "Unstake").withArgs(user_B.address, ethers.parseEther("100"));
      await poolContract.connect(user_B).claim();
      await expect(poolContract.connect(user_B).claim()).revertedWithCustomError(poolContract, "NothingToClaim");
    });

    it("Stake fail: pool is over)", async function () {
      await time.increaseTo(poolEndTime);
      let amount = ethers.parseEther("0");
      await expect(poolContract.stake(amount)).revertedWithCustomError(
        poolContract,
        "PoolHasEnded"
      );
    });

  });
})