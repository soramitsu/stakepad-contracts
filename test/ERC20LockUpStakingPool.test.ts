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
  let unstakeLockUp: number;
  let claimLockUp: number;
  let ipfsHash: BytesLike;
  let signer: HardhatEthersSigner;
  let ayo: HardhatEthersSigner;
  let alina: HardhatEthersSigner;
  let vartan: HardhatEthersSigner;
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
    unstakeLockUp = blockTimestamp;
    claimLockUp = blockTimestamp;
    [signer, ayo, alina, vartan] = await ethers.getSigners();

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
    await mockRewardToken.mint(
      ayo.address,
      ethers.parseEther("2000000000")
    );
  });

  describe("ERC20LockUpStakingPool Deployment", async function () {
    it("Request creation failed: invalid staking token address", async function () {
      poolStartTime += 100;
      poolEndTime = poolStartTime + 120;
      unstakeLockUp = poolStartTime + 10;
      claimLockUp = poolStartTime + 10;
      const data = {
        stakeToken: ethers.ZeroAddress,
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime,
        poolEndTime: poolEndTime,
        unstakeLockUpTime: unstakeLockUp,
        claimLockUpTime: claimLockUp,
        rewardPerSecond: rewardTokenPerSecond
      }
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.connect(ayo).requestDeployment(ipfsHash, data)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidTokenAddress");
      let length = (await ercStakingPoolFactory.getRequests()).length;
      expect(lengthBefore).to.be.equal(length);
    });

    it("Request creation failed: invalid reward token addresses", async function () {
      poolStartTime += 100;
      poolEndTime = poolStartTime + 120;
      unstakeLockUp = poolStartTime + 10;
      claimLockUp = poolStartTime + 10;
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: ethers.ZeroAddress,
        poolStartTime: poolStartTime,
        poolEndTime: poolEndTime,
        unstakeLockUpTime: unstakeLockUp,
        claimLockUpTime: claimLockUp,
        rewardPerSecond: rewardTokenPerSecond
      }
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.connect(ayo).requestDeployment(ipfsHash, data)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidTokenAddress");
      let length = (await ercStakingPoolFactory.getRequests()).length;
      expect(lengthBefore).to.be.equal(length);
    });

    it("Request creation failed: invalid reward token addresses", async function () {
      poolStartTime += 100;
      poolEndTime = poolStartTime + 120;
      unstakeLockUp = poolStartTime + 10;
      claimLockUp = poolStartTime + 10;
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime,
        poolEndTime: poolEndTime,
        unstakeLockUpTime: unstakeLockUp,
        claimLockUpTime: claimLockUp,
        rewardPerSecond: ethers.toBigInt(0)
      }
      let lengthBefore = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.connect(ayo).requestDeployment(ipfsHash, data)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidRewardRate");
      let length = (await ercStakingPoolFactory.getRequests()).length;
      expect(lengthBefore).to.be.equal(length);
    });

    it("Request should be successfully created", async function () {
      poolStartTime += 100;
      poolEndTime = poolStartTime + 120;
      unstakeLockUp = poolStartTime + 10;
      claimLockUp = poolStartTime + 10;
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime,
        poolEndTime: poolEndTime,
        unstakeLockUpTime: unstakeLockUp,
        claimLockUpTime: claimLockUp,
        rewardPerSecond: rewardTokenPerSecond
      }
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(ercStakingPoolFactory.connect(ayo).requestDeployment(ipfsHash, data)).to.emit(ercStakingPoolFactory, "RequestSubmitted").withArgs(length, ayo.address, 1, values);
      length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(length).to.be.equal(1);
      expect(req.info.requestStatus).to.be.equal(1);
      expect(req.info.deployer).to.be.equal(ayo.address);
      expect(req.data).to.be.deep.equal(values);
    });

    it("Request approval failed: invalid caller", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.connect(ayo).approveRequest(length - 1)).to.be.revertedWithCustomError(ercStakingPoolFactory, "OwnableUnauthorizedAccount");
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(1);
    });

    it("Should correctly approve request deployment", async function () {
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

    it("Should correctly deploy pool from APPROVED request", async function () {
      await mockRewardToken
        .connect(ayo)
        .approve(
          await ercStakingPoolFactory.getAddress(),
          parseEther("2000000000")
        );
      let length = (await ercStakingPoolFactory.getRequests()).length;
      await expect(ercStakingPoolFactory.connect(ayo).deploy(length - 1)).to.emit(ercStakingPoolFactory, "StakingPoolDeployed");
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(4);
      let poolsLength = (await ercStakingPoolFactory.getPools()).length;
      let lastPool = await ercStakingPoolFactory.stakingPools(poolsLength - 1);
      poolContract = await ethers.getContractAt(
        "ERC20LockUpPool",
        lastPool
      );
    });

    {
      //Create deployment request
      poolStartTime += 100;
      poolEndTime = poolStartTime + 120;
      unstakeLockup = poolStartTime + 10;
      claimLockup = poolStartTime + 10;
      const data = {
        stakeToken: await mockStakeToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        poolStartTime: poolStartTime,
        poolEndTime: poolEndTime,
        unstakeLockupTime: unstakeLockup,
        claimLockupTime: claimLockup,
        rewardPerSecond: rewardTokenPerSecond
      }
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let values = Object.values(data);
      await expect(ercStakingPoolFactory.connect(ayo).requestDeployment(data)).to.emit(ercStakingPoolFactory, "RequestSubmitted").withArgs(length, ayo.address, 1, values);
      length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(length).to.be.equal(1);
      expect(req.requestStatus).to.be.equal(1);
      expect(req.deployer).to.be.equal(ayo.address);
      expect(req.data).to.be.deep.equal(values);

      //Approve Request
      await ercStakingPoolFactory.approveRequest(length - 1);
      expect(req.requestStatus).to.be.equal(3);
      //Deploy Approved Request
      await mockRewardToken
        .connect(ayo)
        .approve(
          await ercStakingPoolFactory.getAddress(),
          parseEther("2000000000")
        );
      await expect(ercStakingPoolFactory.connect(ayo).deploy(length - 1)).to.emit(ercStakingPoolFactory, "StakingPoolDeployed");
    }

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
      await expect(ercStakingPoolFactory.connect(ayo).requestDeployment(ipfsHash, data)).to.emit(ercStakingPoolFactory, "RequestSubmitted").withArgs(lengthBefore, ayo.address, 1, values);
      let length = (await ercStakingPoolFactory.getRequests()).length;
      expect(length).to.be.equal(lengthBefore + 1);
      
      await ercStakingPoolFactory.approveRequest(length - 1);
      await expect(ercStakingPoolFactory.connect(ayo).deploy(length - 1)).to.be.revertedWithCustomError(poolContract, "InvalidStartTime");
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
      await expect(ercStakingPoolFactory.connect(ayo).requestDeployment(ipfsHash, data)).to.emit(ercStakingPoolFactory, "RequestSubmitted").withArgs(lengthBefore, ayo.address, 1, values);
      let length = (await ercStakingPoolFactory.getRequests()).length;
      
      expect(length).to.be.equal(lengthBefore + 1);
    
      await ercStakingPoolFactory.approveRequest(lengthBefore);
      await expect(ercStakingPoolFactory.connect(ayo).deploy(lengthBefore)).to.be.revertedWithCustomError(poolContract, "InvalidStakingPeriod");
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
      await expect(ercStakingPoolFactory.connect(ayo).requestDeployment(ipfsHash, data)).to.emit(ercStakingPoolFactory, "RequestSubmitted").withArgs(lengthBefore, ayo.address, 1, values);
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(lengthBefore);
      expect(length).to.be.equal(lengthBefore + 1);
      expect(req.info.requestStatus).to.be.equal(1);
      await ercStakingPoolFactory.approveRequest(length - 1);
      await expect(ercStakingPoolFactory.connect(ayo).deploy(lengthBefore)).to.be.revertedWithCustomError(poolContract, "InvalidLockUpTime");
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
      await expect(ercStakingPoolFactory.connect(ayo).requestDeployment(ipfsHash, data)).to.emit(ercStakingPoolFactory, "RequestSubmitted").withArgs(lengthBefore, ayo.address, 1, values);
      await ercStakingPoolFactory.approveRequest(lengthBefore);
      await expect(ercStakingPoolFactory.connect(ayo).deploy(lengthBefore)).to.be.revertedWithCustomError(poolContract, "InvalidLockUpTime");
    });

    it("Cancel last approved request failed: caller is not an owner", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(3);
      await expect(ercStakingPoolFactory.cancelRequest(length - 1)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidCaller");
    });

    it("Cancel last approved request", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(3);
      await expect(ercStakingPoolFactory.connect(ayo).cancelRequest(length - 1)).to.be.emit(ercStakingPoolFactory, "RequestStatusChanged");
      req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(5);
    });

    it("Cancel last approved request failed: already canceled", async function () {
      let length = (await ercStakingPoolFactory.getRequests()).length;
      let req = await ercStakingPoolFactory.requests(length - 1);
      expect(req.info.requestStatus).to.be.equal(5);
      await expect(ercStakingPoolFactory.connect(ayo).cancelRequest(length - 1)).to.be.revertedWithCustomError(ercStakingPoolFactory, "InvalidRequestStatus");
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
      //First transfer stake tokens for user
      await mockStakeToken.transfer(
        ayo.address,
        ethers.parseEther("10000")
      );
      //Approve user to transfer tokens
      await mockStakeToken
        .connect(ayo)
        .approve(
          poolContract.target,
          ethers.parseEther("10000")
        );

      //Stake
      let amount = ethers.parseEther("100");

      await expect(poolContract.connect(ayo).stake(amount)).emit(
        poolContract,
        "Stake"
      ).withArgs(ayo.address, amount);
      await time.increase(5);
    });

    it("Stake: Expect total staked to increase", async function () {
      let amount = ethers.parseEther("100");
      await poolContract.connect(ayo).stake(amount);
      expect((await poolContract.pool()).totalStaked).to.equal(amount + amount);
    });

    it("UnStake: Expect Unstake Emit", async function () {
      let amount = ethers.parseEther("50");
      await expect(
        poolContract.connect(ayo).unstake(amount)
      ).emit(poolContract, "Unstake").withArgs(ayo.address, amount);
    });

    it("Unstake: Expect Total Staked to equal stake token balance", async function () {
      let amount = ethers.parseEther("50");

      let balance = await mockStakeToken.balanceOf(poolContract.target)
      let totalStaked = (await poolContract.pool()).totalStaked
      await expect(poolContract.connect(ayo).unstake(amount)).emit(poolContract, "Unstake");
      balance = await mockStakeToken.balanceOf(poolContract.target)
      totalStaked = (await poolContract.pool()).totalStaked
      expect((await poolContract.pool()).totalStaked).to.equal(amount + amount);
    });

    it("Pending Rewards", async function () {
      let pendingRewards = await poolContract.pendingRewards(ayo.address)
      console.log("Current Time:", await time.latest());
      expect(pendingRewards).to.be.greaterThan(0)
    })

    it("Claim Rewards: Reward Token balance should increase by amount claimed", async function () {
      let initialBalance = await mockRewardToken.balanceOf(ayo.address)
      await expect(poolContract.connect(ayo).claim()).emit(poolContract, "Claim");
      let newBalance = await mockRewardToken.balanceOf(ayo.address)
      expect(newBalance).to.be.greaterThan(initialBalance)
    })

    it("New user stakes", async function () {
      let initialTotalStaked = (await poolContract.pool()).totalStaked
      await mockStakeToken.transfer(alina.address, ethers.parseEther("10000"))
      await mockStakeToken.connect(alina).approve(poolContract.target, ethers.parseEther("10000"))
      await expect(poolContract.connect(alina).stake(ethers.parseEther("100"))).emit(poolContract, "Stake")
      expect((await poolContract.pool()).totalStaked).to.be.greaterThan(initialTotalStaked)
    });

    it("Attempt to unstake more than staked", async function () {
      await expect(poolContract.connect(alina).unstake(ethers.parseEther("10000"))).revertedWithCustomError(poolContract, "InsufficientAmount")
      //await time.increase(5)
    });
    it("Should correctly calculate rewards and match pendingRewards()", async function () {

      // Calculate rewards outside the contract (emulating pendingRewards logic)
      let ayoUser = await poolContract.userInfo(ayo.address);
      const currentTimestamp = await time.latest();

      const pendingRewards = await poolContract.pendingRewards(ayo.address);
      let accRewardPerShare = (await poolContract.pool()).accRewardPerShare;

      let stakingPool = await poolContract.pool()
      if (currentTimestamp > stakingPool.lastUpdateTimestamp && stakingPool.totalStaked !== BigInt(0)) {
        const elapsedPeriod = BigInt(currentTimestamp) - stakingPool.lastUpdateTimestamp;
        const totalNewReward = stakingPool.rewardTokenPerSecond * elapsedPeriod;
        accRewardPerShare += (totalNewReward * PRECISION_FACTOR) / stakingPool.totalStaked;
      }

      const calculatedRewards = ((ayoUser.amount * accRewardPerShare) / PRECISION_FACTOR) - ayoUser.rewardDebt;
      // Compare with the output of pendingRewards()
      console.log("Calculated rewards: " + calculatedRewards, "Pending Rewards: " + pendingRewards)
      expect(calculatedRewards).to.be.closeTo(pendingRewards, ethers.parseEther("0.1")); // Adjust if needed
    });
    it("Another New user stakes", async function () {
      let initialTotalStaked = (await poolContract.pool()).totalStaked
      await mockStakeToken.transfer(vartan.address, ethers.parseEther("10000"))
      await mockStakeToken.connect(vartan).approve(poolContract.target, ethers.parseEther("10000"))
      await expect(poolContract.connect(vartan).stake(ethers.parseEther("100"))).emit(poolContract, "Stake")
      expect((await poolContract.pool()).totalStaked).to.be.greaterThan(initialTotalStaked)
    });
    it("Claim: User 2 reward token amount should increase by amount claimed", async function () {
      await time.increase(5)
      let initialBalance = await mockRewardToken.balanceOf(alina.address)
      await expect(poolContract.connect(alina).claim()).emit(poolContract, "Claim");
      let newBalance = await mockRewardToken.balanceOf(alina.address)
      expect(newBalance).to.be.greaterThan(initialBalance)
    });
    it("Rewards should stop increasing after end pool time", async function () {
      await time.increaseTo(poolEndTime + 1)
      await expect(poolContract.connect(alina).claim()).emit(poolContract, "Claim");
      await time.increase(100)
      let pendingRewards = await poolContract.pendingRewards(alina.address);
      expect(pendingRewards).to.be.equal(0)
    });
  });

  interface StakingPool {
    stakeToken: string;
    rewardToken: string;
    startTime: bigint;
    endTime: bigint;
    unstakeLockUpTime: bigint;
    claimLockUpTime: bigint;
    rewardTokenPerSecond: bigint;
    totalStaked: bigint;
    totalClaimed: bigint;
    lastUpdateTimestamp: bigint;
    accRewardPerShare: bigint;
    isActive: boolean;
    adminWallet: string;
  }
})

// **Helper function for deployment and setup**
async function mint(amount: number, owner: HardhatEthersSigner, token: ERC20MockToken, ){
  await token.mint(
    owner.address,
    ethers.parseEther(""+amount)
  );
}
async function approve(amount: number, owner: HardhatEthersSigner, token: ERC20MockToken, receiverAddress: string){
  await token
    .connect(owner)
    .approve(
      receiverAddress,
      ethers.parseEther(""+amount)
    ); 
}

async function deployAndSetupPool(
  deployer: HardhatEthersSigner, 
  data: {
    stakeToken: string;
    rewardToken: string;
    poolStartTime: number;
    poolEndTime: number;
    unstakeLockupTime: number;
    claimLockupTime: number;
    rewardPerSecond: bigint;}
  ) {
  const { stakeToken, rewardToken, poolStartTime, poolEndTime, unstakeLockupTime, claimLockupTime, rewardPerSecond } = data;

  const ERC20LockUpStakingFactory = await ethers.getContractFactory(
    "ERC20LockUpStakingFactory"
  );
  const ercStakingPoolFactory = await ERC20LockUpStakingFactory.deploy();

  // Create deployment request
  let length = (await ercStakingPoolFactory.getRequests()).length;
  let values = Object.values(data);
  await expect(
    ercStakingPoolFactory.connect(deployer).requestDeployment(data)
  ).to.emit(ercStakingPoolFactory, "RequestSubmitted");

  // Approve and deploy the request
  await ercStakingPoolFactory.approveRequest(length);

  // Mint Reward Token and Deploy]
  let rewardTokenContract = await ethers.getContractAt(
    "ERC20MockToken",
    rewardToken
  );
  await rewardTokenContract.mint(
    deployer.address,
    ethers.parseEther("2000000000")
  );
  await rewardTokenContract
    .connect(deployer)
    .approve(
      await ercStakingPoolFactory.getAddress(),
      ethers.parseEther("2000000000")
    ); 
  await expect(ercStakingPoolFactory.connect(deployer).deploy(length)).to.emit(
    ercStakingPoolFactory,
    "StakingPoolDeployed"
  );
    let poolsLength = (await ercStakingPoolFactory.getPools()).length;
    let lastPool = await ercStakingPoolFactory.stakingPools(poolsLength - 1);
    const poolContract = await ethers.getContractAt(
      "ERC20LockupPool",
      lastPool
    );
  return { poolContract, poolStartTime, poolEndTime, unstakeLockupTime, claimLockupTime };
}

describe("ERC20LockupPool Standard Scenario", function () {
  let mockStakeToken: ERC20MockToken;
  let mockRewardToken: ERC20MockToken;
  let rewardTokenPerSecond: bigint;
  let poolStartTime: number;
  let poolEndTime: number;
  let unstakeLockup: number;
  let claimLockup: number;
  let signer: HardhatEthersSigner;
  let ayo: HardhatEthersSigner;
  let alina: HardhatEthersSigner;
  let vartan: HardhatEthersSigner;
  let nikita: HardhatEthersSigner;
  let mary: HardhatEthersSigner;
  let mansur: HardhatEthersSigner;
  

  beforeEach(async function () {
    
    // Get signers
    [signer, ayo, alina, vartan, signer, nikita, mary, mansur] = await ethers.getSigners();

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
    await mockRewardToken.mint(
      ayo.address,
      ethers.parseEther("2000000000")
    );
    await mockRewardToken.mint(
      ayo.address,
      ethers.parseEther("2000000000")
    );

    rewardTokenPerSecond = ethers.parseEther("1");
    poolStartTime = (await time.latest()) + 100; // Start in 100 seconds
    poolEndTime = poolStartTime + 1000; // End in 1000 seconds after start
    unstakeLockup = poolStartTime + 500; // Lockup 500 seconds after start
    claimLockup = poolStartTime + 200; // Lockup 200 seconds after start
    rewardTokenPerSecond = ethers.parseEther("1"); // 1 RWD per second
  });

  it("Handles standard staking, unstaking, claiming, and pool ending", async function () {
    // Set pool parameters
    poolStartTime = (await time.latest()) + 100; // Start in 100 seconds
    poolEndTime = poolStartTime + 1000; // End in 1000 seconds after start
    unstakeLockup = poolStartTime + 500; // Lockup 500 seconds after start
    claimLockup = poolStartTime + 200; // Lockup 200 seconds after start
    rewardTokenPerSecond = ethers.parseEther("1"); // 1 RWD per second
    const data = {
      stakeToken: await mockStakeToken.getAddress(),
      rewardToken: await mockRewardToken.getAddress(),
      poolStartTime: poolStartTime,
      poolEndTime: poolEndTime,
      unstakeLockupTime: unstakeLockup,
      claimLockupTime: claimLockup,
      rewardPerSecond: rewardTokenPerSecond
    }
    let {poolContract} = await deployAndSetupPool(ayo, data)
    // **Scenario: Pool Not Started**
    await expect(poolContract.stake(ethers.parseEther("100")))
      .to.be.revertedWithCustomError(poolContract, "PoolNotStarted");

    // **Scenario: Pool Started, Staking**
    await time.increase(100); // Advance time to pool start
    await mint(100, alina, mockStakeToken)
    await approve(100, alina, mockStakeToken, await poolContract.getAddress())
    await expect(poolContract.connect(alina).stake(ethers.parseEther("100")))
      .to.emit(poolContract, "Stake")
      .withArgs(alina.address, ethers.parseEther("100"));

    // **Scenario: Unstaking**
    await time.increase(500); // Advance to after unstake lockup
    await expect(poolContract.connect(alina).unstake(ethers.parseEther("50")))
      .to.emit(poolContract, "Unstake")
      .withArgs(alina.address, ethers.parseEther("50"));

    // **Scenario: Claiming Rewards**
    await time.increase(200); // Advance to after claim lockup
    const initialBalance = await mockRewardToken.balanceOf(alina.address);
    await poolContract.connect(alina).claim();
    const finalBalance = await mockRewardToken.balanceOf(alina.address);
    expect(finalBalance).to.be.gt(initialBalance); // Ensure balance increased

    // **Scenario: New User (Vartan) Stakes**
    await mockStakeToken.mint(vartan.address, ethers.parseEther("5000"));
    await mockStakeToken.connect(vartan).approve(poolContract.target, ethers.parseEther("5000"));
    await poolContract.connect(vartan).stake(ethers.parseEther("50"));
    await time.increase(10);
    const vartansFinalRewards = await poolContract.pendingRewards(vartan.address);
    expect(vartansFinalRewards).to.be.gt(0); // Alina should have pending rewards

    // **Scenario: Pool Ends**
    await time.increase(490); // Advance to pool end time
    const alinasFinalRewards = await poolContract.pendingRewards(alina.address);
    let alinaFirstClaimBalance = await mockRewardToken.balanceOf(alina.address);
    expect(alinasFinalRewards).to.be.gt(0); // Alina should have final rewards
    await poolContract.connect(alina).claim(); 
    let alinaBalance = await mockRewardToken.balanceOf(alina.address);
    expect(alinaBalance).to.be.equal(alinaFirstClaimBalance + alinasFinalRewards);
  });

  
  it("Handles multiple users staking different amounts, unstaking, and claiming", async function () {
    poolStartTime = (await time.latest()) + 100; // Start in 100 seconds
    poolEndTime = poolStartTime + 1000; // End in 1000 seconds after start
    unstakeLockup = poolStartTime + 500; // Lockup 500 seconds after start
    claimLockup = poolStartTime + 200; // Lockup 200 seconds after start
    rewardTokenPerSecond = ethers.parseEther("1"); // 1 RWD per second
    const data = {
      stakeToken: await mockStakeToken.getAddress(),
      rewardToken: await mockRewardToken.getAddress(),
      poolStartTime: poolStartTime,
      poolEndTime: poolEndTime,
      unstakeLockupTime: unstakeLockup,
      claimLockupTime: claimLockup,
      rewardPerSecond: rewardTokenPerSecond
    };
    const { poolContract } = await deployAndSetupPool(ayo, data);
    
    
    const users = [ayo, alina, vartan, signer, nikita, mary, mansur];
    let poolAddress = await poolContract.getAddress();
    for (const user of users) {
      await mockStakeToken.mint(user, ethers.parseEther("10000000000"));
      await approve(1000000000, user, mockStakeToken, poolAddress)
    }
  
    await time.increaseTo(poolStartTime);
  
    await poolContract.connect(ayo).stake(ethers.parseEther("75"));
    await poolContract.connect(alina).stake(ethers.parseEther("120"));
    await poolContract.connect(vartan).stake(ethers.parseEther("90"));
    await poolContract.connect(signer).stake(ethers.parseEther("115"));
    await poolContract.connect(nikita).stake(ethers.parseEther("85"));
    await poolContract.connect(mary).stake(ethers.parseEther("105"));
  
    await time.increaseTo(unstakeLockup);
  
    await poolContract.connect(ayo).unstake(ethers.parseEther("30"));
    await poolContract.connect(alina).unstake(ethers.parseEther("40"));
    await poolContract.connect(vartan).unstake(ethers.parseEther("50"));
    await poolContract.connect(signer).unstake(ethers.parseEther("60"));
    await poolContract.connect(nikita).unstake(ethers.parseEther("25"));
    await poolContract.connect(mary).unstake(ethers.parseEther("35"));
  
    const ayoInitialBalance = await mockRewardToken.balanceOf(ayo.address);
    await poolContract.connect(ayo).claim();
    const ayoFinalBalance = await mockRewardToken.balanceOf(ayo.address);
    expect(ayoFinalBalance).to.be.gt(ayoInitialBalance);
  
    const alinaInitialBalance = await mockRewardToken.balanceOf(alina.address);
    await poolContract.connect(alina).claim();
    const alinaFinalBalance = await mockRewardToken.balanceOf(alina.address);
    expect(alinaFinalBalance).to.be.gt(alinaInitialBalance);
  
    const vartanInitialBalance = await mockRewardToken.balanceOf(vartan.address);
    await poolContract.connect(vartan).claim();
    const vartanFinalBalance = await mockRewardToken.balanceOf(vartan.address);
    expect(vartanFinalBalance).to.be.gt(vartanInitialBalance);
  
    const signerInitialBalance = await mockRewardToken.balanceOf(signer.address);
    await poolContract.connect(signer).claim();
    const signerFinalBalance = await mockRewardToken.balanceOf(signer.address);
    expect(signerFinalBalance).to.be.gt(signerInitialBalance);
  
    const nikitaInitialBalance = await mockRewardToken.balanceOf(nikita.address);
    await poolContract.connect(nikita).claim();
    const nikitaFinalBalance = await mockRewardToken.balanceOf(nikita.address);
    expect(nikitaFinalBalance).to.be.gt(nikitaInitialBalance);
  
    const maryInitialBalance = await mockRewardToken.balanceOf(mary.address);
    await poolContract.connect(mary).claim();
    const maryFinalBalance = await mockRewardToken.balanceOf(mary.address);
    expect(maryFinalBalance).to.be.gt(maryInitialBalance);
  
    
    const newStakeAmount = ethers.parseEther("50");
    await mockStakeToken.mint(mansur, newStakeAmount);
    await approve(50, alina, mockStakeToken, await poolContract.getAddress())
    await poolContract.connect(mansur).stake(newStakeAmount);
  
    await time.increaseTo(poolEndTime - 100);
  
    const newUsersRewards = await poolContract.pendingRewards(mansur.address);
    expect(newUsersRewards).to.be.gt(0);
  
    await time.increaseTo(poolEndTime);
  
    const ayoLastBalance = await mockRewardToken.balanceOf(ayo.address);
    await poolContract.connect(ayo).claim();
    const ayoLastFinalBalance = await mockRewardToken.balanceOf(ayo.address);
    expect(ayoLastFinalBalance).to.be.gt(ayoLastBalance);
  
    const alinaLastBalance = await mockRewardToken.balanceOf(alina.address);
    await poolContract.connect(alina).claim();
    const alinaLastFinalBalance = await mockRewardToken.balanceOf(alina.address);
    expect(alinaLastFinalBalance).to.be.gt(alinaLastBalance);
  
    const vartanLastBalance = await mockRewardToken.balanceOf(vartan.address);
    await poolContract.connect(vartan).claim();
    const vartanLastFinalBalance = await mockRewardToken.balanceOf(vartan.address);
    expect(vartanLastFinalBalance).to.be.gt(vartanLastBalance);
  
    const signerLastBalance = await mockRewardToken.balanceOf(signer.address);
    await poolContract.connect(signer).claim();
    const signerLastFinalBalance = await mockRewardToken.balanceOf(signer.address);
    expect(signerLastFinalBalance).to.be.gt(signerLastBalance);
  
    const nikitaLastBalance = await mockRewardToken.balanceOf(nikita.address);
    await poolContract.connect(nikita).claim();
    const nikitaLastFinalBalance = await mockRewardToken.balanceOf(nikita.address);
    expect(nikitaLastFinalBalance).to.be.gt(nikitaLastBalance);
  
    const maryLastBalance = await mockRewardToken.balanceOf(mary.address);
    await poolContract.connect(mary).claim();
    const maryLastFinalBalance = await mockRewardToken.balanceOf(mary.address);
    expect(maryLastFinalBalance).to.be.gt(maryLastBalance); 
  });

  it("Handles two users with randomized staking, unstaking, and claiming", async function () {
    poolStartTime = (await time.latest()) + 100;
    poolEndTime = poolStartTime + 1000;
    unstakeLockup = poolStartTime + 500;
    claimLockup = poolStartTime + 200;
    rewardTokenPerSecond = ethers.parseEther("1");
    const data = {
      stakeToken: await mockStakeToken.getAddress(),
      rewardToken: await mockRewardToken.getAddress(),
      poolStartTime: poolStartTime,
      poolEndTime: poolEndTime,
      unstakeLockupTime: unstakeLockup,
      claimLockupTime: claimLockup,
      rewardPerSecond: rewardTokenPerSecond
    };
    const { poolContract } = await deployAndSetupPool(ayo, data);
  
    const mintAmount = ethers.parseEther("1000");
    const users = [ayo, alina];
    const poolAddress = await poolContract.getAddress();
  
    await mockStakeToken.mint(ayo, ethers.parseEther("10000000000"));
    await approve(1000000000, ayo, mockStakeToken, poolAddress)
    await mockStakeToken.mint(alina, ethers.parseEther("10000000000"));
    await approve(1000000000, alina, mockStakeToken, poolAddress)
  
    await time.increaseTo(poolStartTime);
    await poolContract.connect(ayo).stake(ethers.parseEther("75")); 
  
    await time.increase(100);
  
    await poolContract.connect(alina).stake(ethers.parseEther("120"));
  
    await time.increaseTo(unstakeLockup);
  
    await poolContract.connect(ayo).unstake(ethers.parseEther("30"));
  
    const ayoInitialBalance = await mockRewardToken.balanceOf(ayo.address);
    await poolContract.connect(ayo).claim();
    const ayoFinalBalance = await mockRewardToken.balanceOf(ayo.address);
    expect(ayoFinalBalance).to.be.gt(ayoInitialBalance);
  
    await poolContract.connect(ayo).stake(ethers.parseEther("20"));
  
    const alinaInitialBalance = await mockRewardToken.balanceOf(alina.address);
    await poolContract.connect(alina).claim(); 
    const alinaFinalBalance = await mockRewardToken.balanceOf(alina.address);
    expect(alinaFinalBalance).to.be.gt(alinaInitialBalance);
  
    await time.increase(200);
  
    await poolContract.connect(alina).unstake(ethers.parseEther("40")); 
  
    const newStakeAmount = ethers.parseEther("50");
    await mockStakeToken.mint(mansur, newStakeAmount);
    await approve(50, mansur, mockStakeToken, poolAddress)
    await poolContract.connect(mansur).stake(newStakeAmount);
  
    await time.increaseTo(poolEndTime - 100);
  
    const newUsersRewards = await poolContract.pendingRewards(mansur.address);
    expect(newUsersRewards).to.be.gt(0);
  
    await time.increaseTo(poolEndTime);
  
    const ayoLastBalance = await mockRewardToken.balanceOf(ayo.address);
    await poolContract.connect(ayo).claim();
    const ayoLastFinalBalance = await mockRewardToken.balanceOf(ayo.address);
    expect(ayoLastFinalBalance).to.be.gt(ayoLastBalance);
    
    const alinaLastBalance = await mockRewardToken.balanceOf(alina.address);
    await poolContract.connect(alina).claim();
    const alinaLastFinalBalance = await mockRewardToken.balanceOf(alina.address);
    expect(alinaLastFinalBalance).to.be.gt(alinaLastBalance);
  
    const mansurLastBalance = await mockRewardToken.balanceOf(mansur.address);
    await poolContract.connect(mansur).claim();
    const mansurLastFinalBalance = await mockRewardToken.balanceOf(mansur.address);
    expect(mansurLastFinalBalance).to.be.gt(mansurLastBalance);
  });
  
});
