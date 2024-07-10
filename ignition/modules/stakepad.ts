import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Stakepad", (m) => {
  // Deploying Stakepad's RequestManager contract first
  const requestManager = m.contract("RequestManager", []);
  // Deploying Stakepad's ERC20LockUpStakingFactory contract, passing RequestManager's contract address as an input parameter
  const lockUpFactoryERC20 = m.contract("ERC20LockUpStakingFactory", [requestManager]);
  m.call(requestManager, "addFactory", [lockUpFactoryERC20], { id: "lockUpFactoryERC20"});
  // Deploying Stakepad's ERC20PenaltyFeeStakingFactory contract, passing RequestManager's contract address as an input parameter
  const penaltyFeeFactoryERC20 = m.contract("ERC20PenaltyFeeStakingFactory", [requestManager]);
  m.call(requestManager, "addFactory", [penaltyFeeFactoryERC20], { id: "penaltyFeeFactoryERC20"});
  // Deploying Stakepad's ERC721LockUpStakingFactory contract, passing RequestManager's contract address as an input parameter
  const lockUpFactoryERC721 = m.contract("ERC721LockUpStakingFactory", [requestManager]);
  m.call(requestManager, "addFactory", [lockUpFactoryERC721],  { id: "lockUpFactoryERC721"});
  // Deploying Stakepad's ERC721PenaltyFeeStakingFactory contract, passing RequestManager's contract address as an input parameter
  const penaltyFeeFactoryERC721 = m.contract("ERC721PenaltyFeeStakingFactory", [requestManager]);
  m.call(requestManager, "addFactory", [penaltyFeeFactoryERC721], { id: "penaltyFeeFactoryERC721"});

  return { requestManager, lockUpFactoryERC20, penaltyFeeFactoryERC20, lockUpFactoryERC721, penaltyFeeFactoryERC721 };
});