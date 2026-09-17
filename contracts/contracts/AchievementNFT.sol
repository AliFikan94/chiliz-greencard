// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice Non-transferable-by-default achievement/completion badges for the
/// Greencard learn2earn platform on Chiliz Chain.
/// @dev Minting is restricted to addresses holding MINTER_ROLE (the RewardDistributor).
contract AchievementNFT is ERC721, ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _nextTokenId;

    constructor(address admin) ERC721("Greencard Achievement", "GCARD-ACH") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Mints the next achievement token to `to` with the given metadata URI.
    /// @return tokenId The id of the newly minted token.
    function mint(address to, string calldata uri) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
