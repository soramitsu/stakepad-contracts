// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC20MockToken
/// @notice A mock ERC20 token for testing purposes, with minting and burning capabilities controlled by the owner.
/// @dev Extends the OpenZeppelin ERC20 and Ownable contracts.
contract ERC20MockToken is ERC20, Ownable {
    /// @dev Custom decimal places for the mock token.
    uint8 private immutable _decimals;

    /// @notice Constructor to initialize the mock token with a name, symbol, and decimals.
    /// @param name The name of the token.
    /// @param symbol The symbol of the token.
    /// @param decimals_ The number of decimal places for the token.
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _decimals = decimals_;
    }

    /// @notice Mints new tokens to the specified account.
    /// @param account The address of the account to mint tokens to.
    /// @param amount The amount of tokens to mint.
    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    /// @notice Burns tokens from the specified account.
    /// @param account The address of the account to burn tokens from.
    /// @param amount The amount of tokens to burn.
    function burn(address account, uint256 amount) external onlyOwner {
        _burn(account, amount);
    }

    /// @notice Returns the number of decimals used to get its user representation.
    /// @return The number of decimals.
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
