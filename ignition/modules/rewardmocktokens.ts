import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
export default buildModule("RewardMockTokens", (m) => {
    const rewardToken = m.contract("ERC20MockToken", ["Reward Token", "RTK", 18]);
    m.call(rewardToken, "mint", [process.env.WALLET_ADDRESS as string, "1000000000000000000000000"])
    return { rewardToken };
  });