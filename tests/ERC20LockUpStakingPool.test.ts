import { expect } from "chai";
import { ethers } from "hardhat";
import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { latest } from "@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time";
import { ERC20LockUpStakingPool, ERC20MockToken, ERC20LockUpStakingFactory, ERC20LockUpStakingFactory__factory } from "../typechain";

interface DeploymentParams {
  currentTime: number;
  rewardTokenPerSecond: bigint;
  poolStartTime: number;
  poolEndTime: number;
  unstakeLockup: number;
  claimLockup: number;
  adminAddress: string;
  stakeToken: string;
  rewardToken: string;
}

const standardParams = async function () {
  const currentTime = await latest();
  const signers = await ethers.getSigners();
  const rewardTokenPerSecond = ethers.parseEther("1");
  const poolStartTime = currentTime;
  const poolEndTime = currentTime + 24 * 60 * 60 * 30;
  const unstakeLockup = currentTime + 24 * 60 * 60;
  const claimLockup = currentTime + 10 * 60;
  const [signer] = signers;
  const adminAddress = signer.address;
  const stakeToken = ethers.getAddress(process.env.SampleAddress as string);
  const rewardToken = ethers.getAddress(process.env.SampleAddress as string);
  return {
    adminAddress,
    signers,
    currentTime,
    poolStartTime,
    poolEndTime,
    unstakeLockup,
    claimLockup,
    rewardTokenPerSecond,
    stakeToken,
    rewardToken,
  };
};
const wrongParams = async function () {
  const currentTime = await latest();
  const signers = await ethers.getSigners();
  const rewardTokenPerSecond = ethers.parseEther("1");
  const poolStartTime = currentTime;
  const poolEndTime = currentTime + 24 * 60 * 60 * 30;
  const unstakeLockup = currentTime + 24 * 60 * 60;
  const claimLockup = currentTime + 10 * 60;
  const [signer] = signers;
  const adminAddress = signer.address;
  const stakeToken = ethers.getAddress(process.env.SampleAddress as string);
  const rewardToken = ethers.getAddress(process.env.SampleAddress as string);
  return {
    adminAddress,
    signers,
    currentTime,
    poolStartTime,
    poolEndTime,
    unstakeLockup,
    claimLockup,
    rewardTokenPerSecond,
    stakeToken,
    rewardToken,
  };
};

const loadGeneralDeployment = async function () {
  const {
    adminAddress,
    signers,
    currentTime,
    poolStartTime,
    poolEndTime,
    unstakeLockup,
    claimLockup,
    rewardTokenPerSecond,
    stakeToken,
    rewardToken,
  } = await standardParams();

  const poolContract = await ethers.deployContract("ERC20LockUpStakingPool", [
    ethers.getAddress(ethers.getAddress(process.env.SampleAddress as string)),
    ethers.getAddress(ethers.getAddress(process.env.SampleAddress as string)),
    rewardTokenPerSecond,
    poolStartTime,
    poolEndTime,
    unstakeLockup,
    claimLockup,
    adminAddress,
  ]);
  return {
    poolContract,
    signers,
    currentTime,
    poolStartTime,
    poolEndTime,
    unstakeLockup,
    claimLockup,
    rewardTokenPerSecond,
    adminAddress,
    stakeToken,
    rewardToken,
  };
};

describe("Contract Deployment", async function(){
  let staking: ERC20LockUpStakingPool;
  let StakingFactory: ERC20LockUpStakingFactory__factory;
  let ercStakingPoolFactory: ERC20LockUpStakingFactory;
  let mockStakeToken : ERC20MockToken;
  let mockRewardToken : ERC20MockToken;
  let currentTime = await latest();
  let signers = await ethers.getSigners();
  let rewardTokenPerSecond = ethers.parseEther("1");
  let poolStartTime :number;
  let poolEndTime :number;
  let unstakeLockup :number
  let claimLockup :number;
  let [signer] = signers;

  const [adminAddress] = await ethers.getSigners()
  before(async () => {
    StakingFactory = await ethers.getContractFactory("ERC20LockUpStakingFactory");
    ercStakingPoolFactory = await StakingFactory.deploy();
    const currentTime = await latest();
  signers = await ethers.getSigners();
  rewardTokenPerSecond = ethers.parseEther("1");
  poolStartTime = currentTime;
  poolEndTime = currentTime + 24 * 60 * 60 * 30;
  unstakeLockup = currentTime + 24 * 60 * 60;
  claimLockup = currentTime + 10 * 60;
  [signer] = signers;
  const adminAddress = signer.address;

    mockStakeToken = await ethers.deployContract("ERC20MockToken", 
    ["StakeToken", "STK"]);
    mockRewardToken = await ethers.deployContract("ERC20MockToken", 
    ["RewardToken", "RTK"]);

  })


  describe("ERC20LockUpStakingPool", async function () {
    it("Should be successfully deployed", async function () {
      let poolContract = await ercStakingPoolFactory.deploy(
        ethers.getAddress(process.env.SampleAddress as string), 
        ethers.getAddress(process.env.SampleAddress as string), 
        ethers.parseEther(""+rewardTokenPerSecond),         
        poolStartTime,                                         
        poolEndTime,                                           
        unstakeLockup,                                         
        claimLockup                                            
    );
      expect(poolContract..target).to.be.a.properAddress;
    });
  })

describe("ERC20LockUpStakingPool", async function () {
  it("Should be successfully deployed", async function () {
    const { poolContract } = await loadFixture(loadGeneralDeployment);
    expect(poolContract.target).to.be.a.properAddress;
  });
  it("StartTime must be less than EndTime but Greater than or Equal to current time", async function () {
    const { poolContract, poolEndTime, currentTime } = await loadFixture(
      loadGeneralDeployment
    );
    expect((await poolContract.pool()).startTime).greaterThanOrEqual(
      currentTime
    );
    expect((await poolContract.pool()).startTime).lessThanOrEqual(poolEndTime);
  });
  it("Lockup periods should be valid", async function () {
    const { poolContract, poolEndTime, poolStartTime } = await loadFixture(
      loadGeneralDeployment
    );
    expect((await poolContract.pool()).unstakeLockupTime).greaterThan(
      poolStartTime
    ).to.be.reverted;
    expect((await poolContract.pool()).unstakeLockupTime).lessThan(poolEndTime);
  });
  it("Lockup periods should be valid", async function () {
    const { poolContract, poolEndTime, poolStartTime } = await loadFixture(
      loadGeneralDeployment
    );
    expect((await poolContract.pool()).claimLockupTime).lessThan(poolEndTime);
    expect((await poolContract.pool()).claimLockupTime).greaterThan(
      poolStartTime
    );
  });
  it("Should set correct stake token address", async function () {
    const { poolContract, stakeToken } = await loadFixture(
      loadGeneralDeployment
    );
    expect((await poolContract.pool()).stakeToken).to.equal(stakeToken);
  });

  it("Should correctly set reward token per second, and ensure it is valid", async function () {
    const { poolContract, rewardTokenPerSecond } = await loadFixture(
      loadGeneralDeployment
    );
    expect((await poolContract.pool()).rewardTokenPerSecond).greaterThan(0);
    expect((await poolContract.pool()).rewardTokenPerSecond).to.equal(
      rewardTokenPerSecond
    );
  });
});

describe("Pool Activation", async function () {
  it("Should revert if sender is not admin"),
    async function () {
      const { poolContract, signers } = await loadFixture(
        loadGeneralDeployment
      );
      const stakingPool = await poolContract;
      expect(
        await poolContract.connect(signers[3]).activate()
      ).to.be.revertedWithCustomError(stakingPool, "NotAdmin");
    };
  it("Should revert if pool is already active"),
    async function () {
      const { poolContract, signers } = await loadFixture(
        loadGeneralDeployment
      );
      const stakingPool = await poolContract;
      const [signer] = signers;
      expect(
        poolContract.activate()
      ).to.be.revertedWithCustomError(stakingPool, "PoolIsActive");
    };
});

describe("Stake", async function () {
  it("Should revert if invalid amount", async function () {
    const { poolContract } = await loadFixture(loadGeneralDeployment);
    expect(poolContract.stake(0)).to.be.revertedWithCustomError(
      poolContract,
      "InvalidInput"
    );
  });
  it("Should revert with Pool not active", async function () {
    const { poolContract } = await loadFixture(loadGeneralDeployment);
    expect(poolContract.stake(1)).to.be.revertedWithCustomError(
      poolContract,
      "PoolNotActive"
    );
  });
  it("Should update state correctly and emit Stake event", async function () {
    const { poolContract, signers } = await loadFixture(loadGeneralDeployment);
    const [signer, user] = await ethers.getSigners();
    const stakeAmount = 100;

    await poolContract.connect(signer).activate();

    await expect(poolContract.stake(stakeAmount))
      .to.emit(poolContract, "Stake")
      .withArgs(user.address, stakeAmount);
  });

  it("Should update pool state correctly", async function () {
    const { poolContract, signers, poolStartTime } = await loadFixture(
      loadGeneralDeployment
    );
    const stakeAmount = ethers.parseEther("10");
    const [signer] = signers;

    // Capture state before staking
    const initialTotalStaked = (await poolContract.pool()).totalStaked;
    const user = poolContract.userInfo(signer.address);
    const intialBalance = (await user).amount;

    await poolContract.stake(stakeAmount);

    // Check if state updates are as expected
    expect((await poolContract.pool()).totalStaked).to.equal(
      initialTotalStaked + stakeAmount
    );
    expect((await user).amount).to.equal(intialBalance + stakeAmount);
  });
});
