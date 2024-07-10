// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

interface IGenericFactory {

    error InvalidManagerAddress();
    error InvalidCaller();
    error InvalidPayloadLength();

    function deploy(address deployer, bytes calldata payload) external returns (address);

    event StakingPoolDeployed(address indexed stakingAddress);
}
