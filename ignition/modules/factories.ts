import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("LockupFactory", (m) => {
  const factory = m.contract("ERC20NoLockupStakingFactory", []);
  const Lockupfactory = m.contract("ERC20LockupStakingFactory", []);
  const feeFactory = m.contract("ERC20PenaltyFeeStakingFactory", []);
  return { factory, Lockupfactory, feeFactory };
});