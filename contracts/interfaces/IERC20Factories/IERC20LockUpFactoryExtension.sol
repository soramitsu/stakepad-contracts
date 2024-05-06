// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;
import {IERC20BaseFactory} from "./IERC20BaseFactory.sol";

interface IERC20LockUpFactoryExtension is IERC20BaseFactory {
    
    struct DeploymentData {
        BaseDeploymentData baseParams;
        uint256 unstakeLockupTime; // Lockup period for unstaking
        uint256 claimLockupTime; // Lockup period for claiming rewards
    }

    struct Request {
        uint256 requestId;
        address deployer;
        Status requestStatus;
        DeploymentData data;
    }
}