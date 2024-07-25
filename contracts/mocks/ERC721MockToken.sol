// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC721MockToken
/// @notice A mock ERC721 token for testing purposes, with minting capabilities controlled by the owner.
/// @dev Extends the OpenZeppelin ERC721 and Ownable contracts.
contract ERC721MockToken is ERC721, Ownable {
    /// @dev Counter for tracking the next token ID to be minted.
    uint256 private _nextTokenId;
    
    /// @notice Constructor to initialize the mock token with a name and symbol.
    /// @param name The name of the token.
    /// @param symbol The symbol of the token.
    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) Ownable(msg.sender) {}

    /// @notice Mints a new token to the specified address.
    /// @param to The address to mint the token to.
    function safeMint(address to) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
    }
}
