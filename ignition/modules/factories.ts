import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("LockUpFactory", (m) => {
  const factory = m.contract("ERC20NoLockUpStakingFactory", []);
  const lockUpfactory = m.contract("ERC20LockUpStakingFactory", []);
  const feeFactory = m.contract("ERC20PenaltyFeeStakingFactory", []);
  return { factory, lockUpfactory, feeFactory };
});