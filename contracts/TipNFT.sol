// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol"; // Added
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

/**
 * @title TipNFT
 * @dev A contract for minting NFTs based on ETH tips, with different tiers.
 * Implements ERC721Enumerable, Ownable, Pausable, ReentrancyGuard, and ERC2981.
 */
contract TipNFT is ERC721Enumerable, Ownable, Pausable, ReentrancyGuard, ERC2981 { // Changed to ERC721Enumerable
    /**
     * @dev Represents the different tiers of NFTs that can be minted.
     * Tier.None is unused for actual token tiers.
     */
    enum Tier { None, Tier1, Tier2, Tier3 }

    error NoTipSent();
    error InvalidTier();
    error ZeroAddress();
    error InvalidThresholds();
    error WithdrawFailed();
    // ERC721NonexistentToken is available from OpenZeppelin imports

    /// @notice The threshold in wei for Tier 1 NFTs.
    uint256 public tier1Threshold;
    /// @notice The threshold in wei for Tier 2 NFTs. Tips above this result in Tier 3.
    uint256 public tier2Threshold;

    // `nextTokenId` is removed. We use `_currentTokenId` to manage the next ID to be minted.
    // ERC721Enumerable's `totalSupply()` will correctly count minted tokens.
    uint256 private _currentTokenId;

    /// @notice Maps a token ID to its tier.
    mapping(uint256 => Tier) public tokenTier;
    // mapping(address => uint256[]) public ownedTiers; // Removed, ERC721Enumerable handles this
    
    /// @notice Maps an address to the total amount of ETH they have tipped.
    mapping(address => uint256) public totalTips;

    /**
     * @dev Returns the total number of tokens currently in existence.
     * This relies on ERC721Enumerable's totalSupply after minting.
     * If we need to know the *next* ID before minting, _currentTokenId serves that.
     * For consistency with ERC721Enumerable, this will return the count of minted tokens.
     */
    function totalSupply() public view override(ERC721Enumerable) returns (uint256) { // Explicitly override ERC721Enumerable
        return super.totalSupply();
    }

    /**
     * @dev Returns an array of token IDs owned by `owner_`.
     * Utilizes ERC721Enumerable's capabilities.
     * @param owner_ The address to query.
     * @return An array of token IDs.
     */
    function getOwnedTokens(address owner_) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner_);
        if (tokenCount == 0) {
            return new uint256[](0);
        }
        uint256[] memory tokens = new uint256[](tokenCount);
        for (uint256 i = 0; i < tokenCount; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner_, i);
        }
        return tokens;
    }

    /// @notice Stores the base URI for each token tier. Index 0 is unused.
    string[4] private baseURIs;

    function getBaseURI(Tier tier) external view returns (string memory) {
        if (tier == Tier.None) revert InvalidTier();
        return baseURIs[uint8(tier)];
    }

    event Tip(address indexed donor, uint8 tier, uint256 tokenId, uint256 amount);
    event BaseURISet(uint8 tier, string uri);
    event Withdraw(address indexed to, uint256 amount);
    event ThresholdsUpdated(uint256 tier1, uint256 tier2);
    event Received(address indexed from, uint256 amount);
    event RoyaltyUpdated(address receiver, uint96 feeNumerator);

    /**
     * @dev Contract constructor.
     * @param initialOwner The initial owner of the contract.
     * @param tier1 The threshold for Tier 1 NFTs.
     * @param tier2 The threshold for Tier 2 NFTs.
     */
    constructor(address initialOwner, uint256 tier1, uint256 tier2) ERC721("TipNFT", "TNFT") Ownable(initialOwner) {
        if (tier1 == 0 || tier1 >= tier2) revert InvalidThresholds();
        tier1Threshold = tier1;
        tier2Threshold = tier2;
        _setDefaultRoyalty(initialOwner, 500); // 5% royalties
    }

    /**
     * @dev Pauses tipping functionality. Can only be called by the owner.
     * See {Pausable-_pause}.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses tipping functionality. Can only be called by the owner.
     * See {Pausable-_unpause}.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Sets the base URI for a specific tier. Can only be called by the owner.
     * @param tier The tier for which to set the base URI.
     * @param uri The base URI string.
     */
    function setBaseURI(Tier tier, string calldata uri) external onlyOwner {
        if (tier == Tier.None) revert InvalidTier();
        baseURIs[uint8(tier)] = uri;
        emit BaseURISet(uint8(tier), uri);
    }

    /**
     * @dev Internal function to process a tip and mint an NFT.
     * @param sender The address of the tipper.
     * @param amount The amount of ETH tipped.
     */
    function _processTip(address sender, uint256 amount) internal {
        if (amount == 0) revert NoTipSent();
        Tier tier;
        if (amount <= tier1Threshold) {
            tier = Tier.Tier1;
        } else if (amount <= tier2Threshold) {
            tier = Tier.Tier2;
        } else {
            tier = Tier.Tier3;
        }
        uint256 tokenId = _currentTokenId; // Assign current ID
        _currentTokenId++; // Increment for the next one
        tokenTier[tokenId] = tier;
        // ownedTiers[sender].push(tokenId); // Removed, ERC721Enumerable handles this
        totalTips[sender] += amount;
        _safeMint(sender, tokenId);
        emit Tip(sender, uint8(tier), tokenId, amount);
    }

    /**
     * @dev Allows a user to send a tip and receive an NFT.
     * The contract must not be paused.
     * Reentrancy protected.
     */
    function tip() external payable whenNotPaused nonReentrant {
        _processTip(msg.sender, msg.value);
    }

    /**
     * @dev Fallback function to receive ETH tips.
     * The contract must not be paused.
     * Reentrancy protected.
     */
    receive() external payable whenNotPaused nonReentrant {
        _processTip(msg.sender, msg.value);
        emit Received(msg.sender, msg.value);
    }

    /**
     * @dev Returns the URI for a given token ID.
     * Makes URI publicly accessible for marketplaces.
     * Reverts if the token does not exist.
     * @param tokenId The ID of the token.
     * @return The URI string of the token.
     */
    function tokenURI(uint256 tokenId) public view override(ERC721) returns (string memory) { // Override ERC721's tokenURI
        // Ensure the token exists by calling ownerOf. This will revert with ERC721NonexistentToken if it doesn't.
        ownerOf(tokenId);

        Tier tier = tokenTier[tokenId];
        if (tier == Tier.None) {
            // This case should ideally not be reached if tokens are always minted with a valid tier.
            // However, as a safeguard or if Tier.None could somehow be assigned:
            revert InvalidTier();
        }
        string memory base = baseURIs[uint8(tier)];
        // If base URI for the tier is not set, return empty string as per ERC721 spec for optional tokenURI.
        if (bytes(base).length == 0) {
            return "";
        }
        return string(abi.encodePacked(base, Strings.toString(tokenId)));
    }

    /**
     * @dev Allows the owner to withdraw the entire contract balance.
     * @param to The address to send the funds to.
     */
    function withdraw(address payable to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = address(this).balance;
        if (bal == 0) revert WithdrawFailed();
        (bool sent, ) = to.call{value: bal}("");
        if (!sent) revert WithdrawFailed();
        emit Withdraw(to, bal);
    }

    /**
     * @dev Sets the default royalty information. Can only be called by the owner.
     * @param receiver The address that will receive royalties.
     * @param feeNumerator The royalty percentage (e.g., 500 for 5%).
     */
    function setRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        if (receiver == address(0)) revert ZeroAddress();
        _setDefaultRoyalty(receiver, feeNumerator);
        emit RoyaltyUpdated(receiver, feeNumerator);
    }

    /**
     * @dev Sets the thresholds for NFT tiers. Can only be called by the owner.
     * @param tier1 The new threshold for Tier 1.
     * @param tier2 The new threshold for Tier 2.
     */
    function setTierThresholds(uint256 tier1, uint256 tier2) external onlyOwner {
        if (tier1 == 0 || tier1 >= tier2) revert InvalidThresholds();
        tier1Threshold = tier1;
        tier2Threshold = tier2;
        emit ThresholdsUpdated(tier1, tier2);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     * Includes support for ERC721Enumerable and ERC2981.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable, ERC2981) // This should remain explicit due to multiple inheritance
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // _beforeTokenTransfer hook removed as it uses an outdated signature for OpenZeppelin v5.x
    // and ERC721Enumerable already handles the necessary logic for enumeration.
    // If specific pre-transfer logic unique to TipNFT were needed,
    // the new _update hook would be the place, overriding ERC721Enumerable's _update.
}
