import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  ERC20LockUpPool,
  ERC20MockToken,
  ERC20LockUpStakingFactory,
  ERC20LockUpStakingFactory__factory,
} from "../../typechain";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { BigNumberish, BytesLike, parseEther } from "ethers";
import { mint, approve, deployAndSetupPool } from "../helpers";

describe("ERC20LockupPool Standard Scenario", async function () {
  let mockStakeToken: ERC20MockToken;
  let mockRewardToken: ERC20MockToken;
  let rewardTokenPerSecond: BigNumberish;
  let poolStartTime: BigNumberish;
  let poolEndTime: BigNumberish;
  let unstakeLockUp: BigNumberish;
  let claimLockUp: BigNumberish;
  let ipfsHash: BytesLike;
  let admin: HardhatEthersSigner;
  let deployer: HardhatEthersSigner;
  let signer: HardhatEthersSigner;
  let ayo: HardhatEthersSigner;
  let alina: HardhatEthersSigner;
  let vartan: HardhatEthersSigner;
  let nikita: HardhatEthersSigner;
  let mary: HardhatEthersSigner;
  let mansur: HardhatEthersSigner;

  beforeEach(async function () {
    // Get signers
    [admin, deployer, ayo, alina, vartan, signer, nikita, mary, mansur] =
      await ethers.getSigners();

    mockStakeToken = await ethers.deployContract("ERC20MockToken", [
      "StakeToken",
      "STK",
      18,
    ]);

    mockRewardToken = await ethers.deployContract("ERC20MockToken", [
      "RewardToken",
      "RTK",
      18,
    ]);
    //First mint reward tokens for user before activating pool
    await mockStakeToken.mint(
      admin.address,
      ethers.parseEther("2000000000000000000")
    );
    await mockRewardToken.mint(
      admin.address,
      ethers.parseEther("200000000000000000")
    );
    await approve(1000000000, admin, mockStakeToken, ayo.address);
    await approve(1000000000, admin, mockStakeToken, alina.address);
    await approve(1000000000, admin, mockStakeToken, vartan.address);
    await approve(1000000000, admin, mockStakeToken, nikita.address);
    await approve(1000000000, admin, mockStakeToken, mary.address);
    await approve(1000000000, admin, mockStakeToken, mansur.address);

    ipfsHash = ethers.randomBytes(32);
    rewardTokenPerSecond = ethers.parseEther("1");
    poolStartTime = (await time.latest()) + 100; // Start in 100 seconds
    poolEndTime = poolStartTime + 1000; // End in 1000 seconds after start
    unstakeLockUp = poolStartTime + 500; // Lockup 500 seconds after start
    claimLockUp = poolStartTime + 200; // Lockup 200 seconds after start
    rewardTokenPerSecond = ethers.parseEther("1"); // 1 RWD per second
  });

  async function claimRewards(
    contract: ERC20LockUpPool,
    user: HardhatEthersSigner
  ) {
    const userBalanceBeforeClaim = await mockRewardToken.balanceOf(
      user.address
    );
    const pendingReward = await contract.pendingRewards(user.address);
    await contract.connect(user).claim();
    const userBalanceAfterClaim = await mockRewardToken.balanceOf(user.address);
    return { pendingReward, userBalanceBeforeClaim, userBalanceAfterClaim };
  }

  it("Handles standard staking, unstaking, claiming, and pool ending", async function () {
    // Set pool parameters
    poolStartTime = (await time.latest()) + 100; // Start in 100 seconds
    poolEndTime = poolStartTime + 1000; // End in 1000 seconds after start
    unstakeLockUp = poolStartTime + 500; // Lockup 500 seconds after start
    claimLockUp = poolStartTime + 200; // Lockup 200 seconds after start
    rewardTokenPerSecond = ethers.parseEther("1"); // 1 RWD per second
    const data = {
      stakeToken: await mockStakeToken.getAddress(),
      rewardToken: await mockRewardToken.getAddress(),
      poolStartTime: poolStartTime,
      poolEndTime: poolEndTime,
      unstakeLockUpTime: unstakeLockUp,
      claimLockUpTime: claimLockUp,
      rewardPerSecond: rewardTokenPerSecond,
    };
    let { poolContract } = await deployAndSetupPool(ipfsHash, deployer, data);
    // **Scenario: Pool Not Started**
    await expect(
      poolContract.stake(ethers.parseEther("100"))
    ).to.be.revertedWithCustomError(poolContract, "PoolNotStarted");

    // **Scenario: Pool Started, Staking**
    await time.increase(100); // Advance time to pool start
    await mint(100, alina, mockStakeToken);
    await approve(100, alina, mockStakeToken, await poolContract.getAddress());
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
    let { pendingReward, userBalanceBeforeClaim, userBalanceAfterClaim } =
      await claimRewards(poolContract, alina);
    expect(userBalanceAfterClaim).to.be.equal(
      pendingReward + userBalanceBeforeClaim
    );

    // **Scenario: New User (Vartan) Stakes**
    await mockStakeToken.transferFrom(
      admin.address,
      vartan.address,
      ethers.parseEther("5000")
    );
    await mockStakeToken
      .connect(vartan)
      .approve(poolContract.target, ethers.parseEther("5000"));
    await poolContract.connect(vartan).stake(ethers.parseEther("50"));

    // **Scenario: Pool Ends**
    await time.increase(490); // Advance to pool end time
    let {
      pendingReward: alinaPending,
      userBalanceBeforeClaim: alinaInitialBalance,
      userBalanceAfterClaim: alinaFinalBalance,
    } = await claimRewards(poolContract, alina);
    expect(alinaFinalBalance).to.be.equal(alinaPending + alinaInitialBalance);
  });

  it("Handles multiple users staking different amounts, unstaking, and claiming", async function () {
    poolStartTime = (await time.latest()) + 100; // Start in 100 seconds
    poolEndTime = poolStartTime + 1000; // End in 1000 seconds after start
    unstakeLockUp = poolStartTime + 500; // Lockup 500 seconds after start
    claimLockUp = poolStartTime + 200; // Lockup 200 seconds after start
    rewardTokenPerSecond = ethers.parseEther("1"); // 1 RWD per second
    const data = {
      stakeToken: await mockStakeToken.getAddress(),
      rewardToken: await mockRewardToken.getAddress(),
      poolStartTime: poolStartTime,
      poolEndTime: poolEndTime,
      rewardPerSecond: rewardTokenPerSecond,
      unstakeLockUpTime: unstakeLockUp,
      claimLockUpTime: claimLockUp,
    };
    const { poolContract } = await deployAndSetupPool(ipfsHash, deployer, data);

    const users = [admin, ayo, alina, vartan, signer, nikita, mary, mansur];
    let poolAddress = await poolContract.getAddress();
    for (const user of users) {
      await approve(1000000000000, user, mockStakeToken, poolAddress);
      await approve(1000000000000, admin, mockStakeToken, user.address);
      await mockStakeToken.transferFrom(
        admin,
        user,
        ethers.parseEther("10000000000")
      );
    }

    await time.increaseTo(poolStartTime);

    await poolContract.connect(ayo).stake(ethers.parseEther("75"));
    await poolContract.connect(alina).stake(ethers.parseEther("120"));
    await poolContract.connect(vartan).stake(ethers.parseEther("90"));
    await poolContract.connect(signer).stake(ethers.parseEther("115"));
    await poolContract.connect(nikita).stake(ethers.parseEther("85"));
    await poolContract.connect(mary).stake(ethers.parseEther("105"));

    await time.increaseTo(unstakeLockUp);

    await poolContract.connect(ayo).unstake(ethers.parseEther("30"));
    await poolContract.connect(alina).unstake(ethers.parseEther("40"));
    await poolContract.connect(vartan).unstake(ethers.parseEther("50"));
    await poolContract.connect(signer).unstake(ethers.parseEther("60"));
    await poolContract.connect(nikita).unstake(ethers.parseEther("25"));
    await poolContract.connect(mary).unstake(ethers.parseEther("35"));

    let {
      pendingReward: ayoPending,
      userBalanceBeforeClaim: ayoInitialBalance,
      userBalanceAfterClaim: ayoFinalBalance,
    } = await claimRewards(poolContract, ayo);
    expect(ayoFinalBalance).to.be.equal(ayoPending + ayoInitialBalance);

    let {
      pendingReward: alinaPending,
      userBalanceBeforeClaim: alinaInitialBalance,
      userBalanceAfterClaim: alinaFinalBalance,
    } = await claimRewards(poolContract, alina);
    expect(alinaFinalBalance).to.be.equal(alinaPending + alinaInitialBalance);

    let {
      pendingReward: vartanPending,
      userBalanceBeforeClaim: vartanInitialBalance,
      userBalanceAfterClaim: vartanFinalBalance,
    } = await claimRewards(poolContract, vartan);
    expect(vartanFinalBalance).to.be.equal(
      vartanPending + vartanInitialBalance
    );

    let {
      pendingReward: signerPending,
      userBalanceBeforeClaim: signerInitialBalance,
      userBalanceAfterClaim: signerFinalBalance,
    } = await claimRewards(poolContract, signer);
    expect(signerFinalBalance).to.be.equal(
      signerPending + signerInitialBalance
    );

    let {
      pendingReward: nikitaPending,
      userBalanceBeforeClaim: nikitaInitialBalance,
      userBalanceAfterClaim: nikitaFinalBalance,
    } = await claimRewards(poolContract, nikita);
    expect(nikitaFinalBalance).to.be.equal(
      nikitaPending + nikitaInitialBalance
    );

    let {
      pendingReward: maryPending,
      userBalanceBeforeClaim: maryInitialBalance,
      userBalanceAfterClaim: maryFinalBalance,
    } = await claimRewards(poolContract, mary);
    expect(maryFinalBalance).to.be.equal(maryPending + maryInitialBalance);

    const newStakeAmount = ethers.parseEther("50");
    await mockStakeToken.transferFrom(admin, mansur, newStakeAmount);
    await approve(50, alina, mockStakeToken, await poolContract.getAddress());
    await poolContract.connect(mansur).stake(newStakeAmount);

    await time.increaseTo(poolEndTime - 100);

    await time.increaseTo(poolEndTime);

    let {
      pendingReward: ayo2Pending,
      userBalanceBeforeClaim: ayo2InitialBalance,
      userBalanceAfterClaim: ayo2FinalBalance,
    } = await claimRewards(poolContract, ayo);
    expect(ayo2FinalBalance).to.be.equal(ayo2Pending + ayo2InitialBalance);

    let {
      pendingReward: alinaLastPending,
      userBalanceBeforeClaim: alinaLastInitialBalance,
      userBalanceAfterClaim: alinaLastFinalBalance,
    } = await claimRewards(poolContract, alina);
    expect(alinaLastFinalBalance).to.be.equal(
      alinaLastPending + alinaLastInitialBalance
    );

    let {
      pendingReward: vartanLastPending,
      userBalanceBeforeClaim: vartanLastInitialBalance,
      userBalanceAfterClaim: vartanLastFinalBalance,
    } = await claimRewards(poolContract, vartan);
    expect(vartanLastFinalBalance).to.be.equal(
      vartanLastPending + vartanLastInitialBalance
    );

    let {
      pendingReward: signerLastPending,
      userBalanceBeforeClaim: signerLastInitialBalance,
      userBalanceAfterClaim: signerLastFinalBalance,
    } = await claimRewards(poolContract, signer);
    expect(signerLastFinalBalance).to.be.equal(
      signerLastPending + signerLastInitialBalance
    );

    let {
      pendingReward: nikitaLastPending,
      userBalanceBeforeClaim: nikitaLastInitialBalance,
      userBalanceAfterClaim: nikitaLastFinalBalance,
    } = await claimRewards(poolContract, nikita);
    expect(nikitaLastFinalBalance).to.be.equal(
      nikitaLastPending + nikitaLastInitialBalance
    );

    let {
      pendingReward: maryLastPending,
      userBalanceBeforeClaim: maryLastInitialBalance,
      userBalanceAfterClaim: maryLastFinalBalance,
    } = await claimRewards(poolContract, mary);
    expect(maryLastFinalBalance).to.be.equal(
      maryLastPending + maryLastInitialBalance
    );
  });

  it("Handles two users with randomized staking, unstaking, and claiming", async function () {
    poolStartTime = (await time.latest()) + 100;
    poolEndTime = poolStartTime + 1000;
    unstakeLockUp = poolStartTime + 500;
    claimLockUp = poolStartTime + 200;
    rewardTokenPerSecond = ethers.parseEther("1");
    const data = {
      stakeToken: await mockStakeToken.getAddress(),
      rewardToken: await mockRewardToken.getAddress(),
      poolStartTime: poolStartTime,
      poolEndTime: poolEndTime,
      rewardPerSecond: rewardTokenPerSecond,
      unstakeLockUpTime: unstakeLockUp,
      claimLockUpTime: claimLockUp,
    };
    const { poolContract } = await deployAndSetupPool(ipfsHash, deployer, data);
    const users = [admin, ayo, alina, vartan, signer, nikita, mary, mansur];
    const poolAddress = await poolContract.getAddress();
    for (const user of users) {
      await approve(1000000000000, user, mockStakeToken, poolAddress);
      await approve(1000000000000, admin, mockStakeToken, user.address);
      await mockStakeToken.transferFrom(
        admin,
        user,
        ethers.parseEther("10000000000")
      );
    }
    const mintAmount = ethers.parseEther("1000");

    await approve(10000, ayo, mockStakeToken, poolAddress);
    await approve(10000, alina, mockStakeToken, poolAddress);

    await time.increaseTo(poolStartTime);
    await poolContract.connect(ayo).stake(ethers.parseEther("75"));

    await time.increase(100);

    await poolContract.connect(alina).stake(ethers.parseEther("120"));

    await time.increaseTo(unstakeLockUp);

    await poolContract.connect(ayo).unstake(ethers.parseEther("30"));

    let {
      pendingReward: ayoPending,
      userBalanceBeforeClaim: ayoInitialBalance,
      userBalanceAfterClaim: ayoFinalBalance,
    } = await claimRewards(poolContract, ayo);
    expect(ayoFinalBalance).to.be.equal(ayoPending + ayoInitialBalance);

    await poolContract.connect(ayo).stake(ethers.parseEther("20"));

    let {
      pendingReward: alinaPending,
      userBalanceBeforeClaim: alinaInitialBalance,
      userBalanceAfterClaim: alinaFinalBalance,
    } = await claimRewards(poolContract, alina);
    expect(alinaFinalBalance).to.be.equal(alinaPending + alinaInitialBalance);

    await time.increase(200);

    await poolContract.connect(alina).unstake(ethers.parseEther("40"));

    const newStakeAmount = ethers.parseEther("50");
    await mockStakeToken.transferFrom(admin, mansur, newStakeAmount);
    await approve(50, mansur, mockStakeToken, poolAddress);
    await poolContract.connect(mansur).stake(newStakeAmount);

    await time.increaseTo(poolEndTime);

    let {
      pendingReward: ayoLastPending,
      userBalanceBeforeClaim: ayoLastInitialBalance,
      userBalanceAfterClaim: ayoLastFinalBalance,
    } = await claimRewards(poolContract, ayo);
    expect(ayoLastFinalBalance).to.be.equal(
      ayoLastPending + ayoLastInitialBalance
    );

    let {
      pendingReward: alinaLastPending,
      userBalanceBeforeClaim: alinaLastInitialBalance,
      userBalanceAfterClaim: alinaLastFinalBalance,
    } = await claimRewards(poolContract, alina);
    expect(alinaLastFinalBalance).to.be.equal(
      alinaLastPending + alinaLastInitialBalance
    );

    let {
      pendingReward: mansurLastPending,
      userBalanceBeforeClaim: mansurLastInitialBalance,
      userBalanceAfterClaim: mansurLastFinalBalance,
    } = await claimRewards(poolContract, mansur);
    expect(mansurLastFinalBalance).to.be.equal(
      mansurLastPending + mansurLastInitialBalance
    );
  });
});
