
import { ERC20MockToken } from "../../typechain";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { BigNumberish, BytesLike } from "ethers";
import { ethers } from "hardhat";

// **Helper function for deployment and setup**
export async function mint(amount: BigNumberish, owner: HardhatEthersSigner, token: ERC20MockToken,) {
    await token.mint(
        owner.address,
        ethers.parseEther("" + amount)
    );
}
export async function approve(amount: BigNumberish, owner: HardhatEthersSigner, token: ERC20MockToken, receiverAddress: string) {
    await token
        .connect(owner)
        .approve(
            receiverAddress,
            ethers.parseEther("" + amount)
        );
}

export async function deployAndSetupPool(
    ipfsHash: BytesLike,
    deployer: HardhatEthersSigner,
    data: {
        stakeToken: string;
        rewardToken: string;
        poolStartTime: BigNumberish;
        poolEndTime: BigNumberish;
        unstakeLockUpTime: BigNumberish;
        claimLockUpTime: BigNumberish;
        rewardPerSecond: BigNumberish;
    }
) {
    const { stakeToken, rewardToken, poolStartTime, poolEndTime, unstakeLockUpTime, claimLockUpTime, rewardPerSecond } = data;

    const ERC20LockUpStakingFactory = await ethers.getContractFactory(
        "ERC20LockUpStakingFactory"
    );
    const ercStakingPoolFactory = await ERC20LockUpStakingFactory.deploy();

    // Create deployment request
    let length = (await ercStakingPoolFactory.getRequests()).length;
    await ercStakingPoolFactory.connect(deployer).requestDeployment(ipfsHash, data);

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
    await ercStakingPoolFactory.connect(deployer).deploy(length);
    let poolsLength = (await ercStakingPoolFactory.getPools()).length;
    let lastPool = await ercStakingPoolFactory.stakingPools(poolsLength - 1);
    const poolContract = await ethers.getContractAt(
        "ERC20LockUpPool",
        lastPool
    );
    return { poolContract, poolStartTime, poolEndTime, unstakeLockUpTime, claimLockUpTime };
}