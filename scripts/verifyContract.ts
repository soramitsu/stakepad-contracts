import { ethers, run, network } from "hardhat";
import config from "../hardhat.config"; // Your Hardhat config file

async function main() {
  const contractAddress = "0x2CB4a3e461d6cE5f3A80B28Bb8596c734E267c26"; // Replace with your deployed address
  const contractName = "ERC20LockUpPool"; 

  // Ensure the contract is already deployed on the target network
  const deployedCode = await ethers.provider.getCode(contractAddress);
  if (deployedCode === "0x") {
    throw new Error(
      `Contract not deployed at address: ${contractAddress} on network: ${network.name}`
    );
  }

  const poolStartTime = 1720229672;
  const poolEndTime = poolStartTime + 120;
  const unstakeLockUp = poolStartTime + 10;
  const claimLockUp = poolStartTime + 10;
  const rewardPerSecond = 1;

  // Verify on Etherscan
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [
        "0xAfe9448d1C50F1cb3697b50EbDB956C8C73e0A7a", // stakeToken
        "0xA854C1bC1aEcC80094E2ac3C0EE98581460F1caD", // rewardToken
        poolStartTime,
        poolEndTime,
        unstakeLockUp,
        claimLockUp,
        rewardPerSecond,
      ], // Add constructor arguments
      contract: `contracts/pools/ERC20LockUpStakingPool.sol:ERC20LockUpPool`, // Path from Hardhat root
    });

    console.log("Contract verified successfully!");
  } catch (error) {
    if ((error as Error).message.includes("Contract source code already verified")) {
      console.log("Contract already verified");
    } else {
      console.error("Error verifying contract:", error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});