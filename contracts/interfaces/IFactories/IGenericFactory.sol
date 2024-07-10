// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

/// @title Generic Factory Interface
/// @notice Defines the main errors and events used in all inherited factories from the generic one.
/// @dev This interface is used in a GenericFactory contract which is inherited by the other specific factory contracts.
interface IGenericFactory {
    /// @notice Error to indicate when an invalid request manager contract's address was submitted.
    error InvalidManagerAddress();
    /// @notice Error to indicate when the caller is not authorized.
    error InvalidCaller();
    /// @notice Error to indicate when an invalid payload was submitted.
    error InvalidPayloadLength();

    function deploy(address deployer, bytes calldata payload) external returns (address);

    event StakingPoolDeployed(address indexed stakingAddress);
}
