import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("LockUpFactory", (m) => {
  const lockUpfactory = m.contract("ERC20LockUpStakingFactory", []);
  const feeFactory = m.contract("ERC20PenaltyFeeStakingFactory", []);
  return { lockUpfactory, feeFactory };
});