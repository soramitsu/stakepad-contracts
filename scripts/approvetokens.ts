import { ethers } from "hardhat";
async function main() {
    let token = await ethers.getContractAt("ERC20MockToken", ""/**Contract Address */);
    await token.approve(process.env.WALLET_ADDRESS as string, "1000000000000000000000000")
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});