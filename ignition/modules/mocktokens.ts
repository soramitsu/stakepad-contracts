import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


export default buildModule("StakeMockTokens", (m) => {
  const stakeToken = m.contract("ERC20MockToken", ["Stake Token", "STK", 18]);
  m.call(stakeToken, "mint", [process.env.WALLET_ADDRESS as string, "1000000000000000000000000"])
  return { stakeToken};
});

