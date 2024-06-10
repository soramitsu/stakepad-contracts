import { BytesLike } from "ethers";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
async function main() {
    let poolStartTime = 1720229672;
    let poolEndTime = poolStartTime + 120;
    let unstakeLockUp = poolStartTime + 10;
    let claimLockUp = poolStartTime + 10;
    
      const data = {
        stakeToken: "0xAfe9448d1C50F1cb3697b50EbDB956C8C73e0A7a",
        rewardToken: "0xA854C1bC1aEcC80094E2ac3C0EE98581460F1caD",
        poolStartTime: poolStartTime,
        poolEndTime: poolEndTime,
        unstakeLockUpTime: unstakeLockUp,
        claimLockUpTime: claimLockUp,
        rewardPerSecond: 1
      }
    let factory = await ethers.getContractAt("ERC20LockUpStakingFactory", "0xa5Ffec47E75a69E5EE8480150372e6D7754b1A9D"/**Contract Address */);
    await factory.requestDeployment(ethers.randomBytes(32), data)
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});