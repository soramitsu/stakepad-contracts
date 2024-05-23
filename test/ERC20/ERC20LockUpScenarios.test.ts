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
import { increaseTo } from "@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time";

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
    const users = [admin, ayo, alina, vartan, signer, nikita, mary];
    let poolAddress = await poolContract.getAddress();
    for (const user of users) {
      await approve(1000000000000, user, mockStakeToken, poolAddress);
      await approve(1000000000000, admin, mockStakeToken, user.address);
      await mockStakeToken.transferFrom(admin, user, ethers.parseEther("200"));
    }
    // **Scenario: Pool Not Started**
    await expect(
      poolContract.stake(ethers.parseEther("100"))
    ).to.be.revertedWithCustomError(poolContract, "PoolNotStarted");

    // **Scenario: Pool Started, Staking**
    await time.increase(100); // Advance time to pool start
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
      parseEther("702.0")
    );

    // **Scenario: New User (Vartan) Stakes**
    //Fund Vartan
    await approve(1000000000000, admin, mockStakeToken, vartan.address);
    await mockStakeToken
        .connect(admin)
        .approve(
          vartan.address,
            ethers.parseEther("" + 5000)
        );
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

  it("Handles multiple users staking/unstaking/claiming with reward calculations", async function () {
    poolStartTime = (await time.latest()) + 100; // Start in 100 seconds
    poolEndTime = poolStartTime + 1000; // End in 1000 seconds after start
    unstakeLockUp = poolStartTime + 500; // Lockup 500 seconds after start
    claimLockUp = poolStartTime + 200; // Lockup 200 seconds after start
    rewardTokenPerSecond = ethers.parseEther("1"); // 1 RWD per second
    console.log("poolStartTime: " + poolStartTime);
    console.log("poolEndTime: " + poolEndTime);
    console.log("unstakeLockUp: " + unstakeLockUp);
    console.log("claimLockUp: " + claimLockUp);

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

    // Approve and transfer stake tokens to all users (except mansur)
    const users = [admin, ayo, alina, vartan, signer, nikita, mary];
    let poolAddress = await poolContract.getAddress();
    for (const user of users) {
      await approve(1000000000000, user, mockStakeToken, poolAddress);
      await approve(1000000000000, admin, mockStakeToken, user.address);
      await mockStakeToken.transferFrom(admin, user, ethers.parseEther("200"));
    }

    // --- Initial Staking (Time = 100 seconds)
    await time.increaseTo(poolStartTime);

    await poolContract.connect(ayo).stake(ethers.parseEther("75"));
    expect(await mockStakeToken.balanceOf(ayo.address)).to.equal(
      ethers.parseEther("125")
    ); // 200 - 75

    await poolContract.connect(alina).stake(ethers.parseEther("120"));
    expect(await mockStakeToken.balanceOf(alina.address)).to.equal(
      ethers.parseEther("80")
    ); // 200 - 120

    await poolContract.connect(vartan).stake(ethers.parseEther("90"));
    expect(await mockStakeToken.balanceOf(vartan.address)).to.equal(
      ethers.parseEther("110")
    ); // 200 - 90

    await poolContract.connect(signer).stake(ethers.parseEther("115"));
    expect(await mockStakeToken.balanceOf(signer.address)).to.equal(
      ethers.parseEther("85")
    ); // 200 - 115

    await poolContract.connect(nikita).stake(ethers.parseEther("85"));
    expect(await mockStakeToken.balanceOf(nikita.address)).to.equal(
      ethers.parseEther("115")
    ); // 200 - 85

    await poolContract.connect(mary).stake(ethers.parseEther("105"));
    expect(await mockStakeToken.balanceOf(mary.address)).to.equal(
      ethers.parseEther("95")
    ); // 200 - 105

    // --- First Claim Period (Time = 300 seconds) ---
    await time.increaseTo(claimLockUp);

    let { pendingReward: ayoPending } = await claimRewards(poolContract, ayo);
    expect(ayoPending).to.be.closeTo(
      ethers.parseEther("26.65"),
      ethers.parseEther("0.1")
    );

    let { pendingReward: alinaPending } = await claimRewards(
      poolContract,
      alina
    );
    expect(alinaPending).to.be.closeTo(
      ethers.parseEther("41.244"),
      ethers.parseEther("0.1")
    );

    let { pendingReward: vartanPending } = await claimRewards(
      poolContract,
      vartan
    );
    expect(vartanPending).to.be.closeTo(
      ethers.parseEther("30.624"),
      ethers.parseEther("0.1")
    );

    let { pendingReward: signerPending } = await claimRewards(
      poolContract,
      signer
    );
    expect(signerPending).to.be.closeTo(
      ethers.parseEther("38.922"),
      ethers.parseEther("0.1")
    );

    let { pendingReward: nikitaPending } = await claimRewards(
      poolContract,
      nikita
    );
    expect(nikitaPending).to.be.closeTo(
      ethers.parseEther("28.7"),
      ethers.parseEther("0.1")
    );

    let { pendingReward: maryPending } = await claimRewards(poolContract, mary);
    expect(maryPending).to.be.closeTo(
      ethers.parseEther("35.415"),
      ethers.parseEther("0.1")
    );

    // --- First Unstaking (Time = 600 seconds) ---
    await time.increaseTo(unstakeLockUp);

    await poolContract.connect(ayo).unstake(ethers.parseEther("30"));
    expect(await mockStakeToken.balanceOf(ayo.address)).to.equal(
      ethers.parseEther("155")
    ); // 125 + 30

    await poolContract.connect(alina).unstake(ethers.parseEther("40"));
    expect(await mockStakeToken.balanceOf(alina.address)).to.equal(
      ethers.parseEther("120")
    ); // 80 + 40

    await poolContract.connect(vartan).unstake(ethers.parseEther("50"));
    expect(await mockStakeToken.balanceOf(vartan.address)).to.equal(
      ethers.parseEther("160")
    ); // 110 + 50

    await poolContract.connect(signer).unstake(ethers.parseEther("60"));
    expect(await mockStakeToken.balanceOf(signer.address)).to.equal(
      ethers.parseEther("145")
    ); // 85 + 60

    await poolContract.connect(nikita).unstake(ethers.parseEther("25"));
    expect(await mockStakeToken.balanceOf(nikita.address)).to.equal(
      ethers.parseEther("140")
    ); // 115 + 25

    await poolContract.connect(mary).unstake(ethers.parseEther("35"));
    expect(await mockStakeToken.balanceOf(mary.address)).to.equal(
      ethers.parseEther("130")
    ); // 95 + 35

    // --- Second Claim Period (Time = 900 seconds) ---
    await time.increaseTo(unstakeLockUp + 400); // 400 seconds after unstake lockup end

    let { pendingReward: ayoSecondPending } = await claimRewards(
      poolContract,
      ayo
    );
    expect(ayoSecondPending).to.be.closeTo(
      ethers.parseEther("89.282"),
      ethers.parseEther("0.1")
    );

    let { pendingReward: alinaSecondPending } = await claimRewards(
      poolContract,
      alina
    );
    expect(alinaSecondPending).to.be.closeTo(
      ethers.parseEther("152.04"),
      ethers.parseEther("0.1")
    );

    let { pendingReward: vartanSecondPending } = await claimRewards(
      poolContract,
      vartan
    );
    expect(vartanSecondPending).to.be.closeTo(
      ethers.parseEther("91.335"),
      ethers.parseEther("0.1")
    );

    let {
      pendingReward: nikitaSecondPending
    } = await claimRewards(poolContract, nikita);
    expect(nikitaSecondPending).to.be.closeTo(
      ethers.parseEther("111.56"),
      ethers.parseEther("0.1")
    );

    let { pendingReward: marySecondPending } = await claimRewards(
      poolContract,
      mary
    );
    expect(marySecondPending).to.be.closeTo(
      ethers.parseEther("133.24"),
      ethers.parseEther("0.1")
    );
  });
});
