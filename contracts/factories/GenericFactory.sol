/*
Factory Generic
SPDX-License-Identifier: MIT
*/

pragma solidity 0.8.25;
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IGenericFactory} from "../interfaces/IFactories/IGenericFactory.sol";

abstract contract GenericFactory is Ownable, IGenericFactory {
    address public requestManager;
    address[] public stakingPools;

    constructor(address managerContract) Ownable(msg.sender) {
        if (managerContract == address(0)) revert InvalidManagerAddress();
        requestManager = managerContract;
    }

    /// @notice Function allows admins to replace RequestManager contract's address in case of repdeployment
    /// @param newManagerContract Address of the new RequestManager contract
    function updateManagerContract(
        address newManagerContract
    ) external onlyOwner {
        if (newManagerContract == address(0) || newManagerContract == address(this)) revert InvalidManagerAddress();
        requestManager = newManagerContract;
    }

    /// @notice Returns all staking pools deployed by this factory.
    /// @return pools Array of all staking pool addresses.
    function getPools() external view returns (address[] memory pools) {
        pools = stakingPools;
    }
}
