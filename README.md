# TipNFT: Tiered NFT Minting Contract

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity Version](https://img.shields.io/badge/solidity-%5E0.8.20-blue)](https://soliditylang.org/)
[![Hardhat](https://hardhat.org/hardhat-plugin-badges/badge.svg)](https://hardhat.org)

<div align="center">
  <picture>
    <source srcset="https://raw.githubusercontent.com/Christopher-Schulze/TipNFT/main/logo/tipnft_512x512.png?raw=true" media="(prefers-color-scheme: dark)">
    <img src="https://raw.githubusercontent.com/Christopher-Schulze/TipNFT/main/logo/tipnft_512x512.png?raw=true" alt="TipNFT Logo" width="300" style="background: transparent;">
  </picture>
</div>

> **TipNFT** is a meticulously crafted smart contract that allows users to mint unique Non-Fungible Tokens (NFTs) by sending Ether (ETH) tips. Each donation is rewarded with an NFT badge, categorized into different tiers based on the tip amount. The project emphasizes robust security measures, gas efficiency, and strict adherence to critical NFT standards such as ERC721, ERC721Enumerable, and ERC2981, reflecting a commitment to expert smart contract engineering and a high-quality, professional-grade implementation.

For a comprehensive technical overview, contract details, and advanced usage, please refer to the **[Full Technical Documentation](./docs/DOCUMENTATION.md)**.

## Key Features

-   **Tiered NFT Minting**: Users receive NFTs (Tier1, Tier2, or Tier3) based on configurable ETH tip amounts.
-   **ERC721Enumerable Standard**: Enables efficient on-chain tracking and querying of token ownership.
-   **Customizable Metadata**: Contract owner can set distinct base URIs for each NFT tier using `setBaseURI()`.
-   **ERC2981 Royalties**: Implements standardized on-chain royalty information, defaulting to 5% to the owner, configurable via `setRoyalty()`.
-   **Owner-Controlled Functions**:
    -   Adjustable tipping thresholds (`setTierThresholds()`).
    -   Pausable tipping functionality (`pause()`/`unpause()`).
    -   Withdrawal of accumulated ETH balance (`withdraw()`).
-   **Robust Security**:
    -   Reentrancy protection via OpenZeppelin's `ReentrancyGuard`.
    -   Access control for sensitive functions using `Ownable`.
-   **Comprehensive Events**: Detailed event emission for all significant contract actions, enhancing off-chain tracking and transparency.
-   **Gas Efficiency**: Optimized through mechanisms like custom errors for reverts.

## Project Structure

```
TipNFT/
├── contracts/
│   ├── TipNFT.sol          # Main smart contract
│   └── Reenter.sol         # Attacker contract for reentrancy tests
├── docs/
│   ├── DOCUMENTATION.md    # Detailed technical documentation
│   └── Changelog.md        # Project changelog
├── scripts/
│   └── deploy.js           # Hardhat deployment script
├── test/
│   ├── TipNFT.test.js      # Unit and integration tests
│   └── Reentrancy.test.js  # Reentrancy specific tests
├── .env.example            # Environment variable template
├── hardhat.config.js       # Hardhat project configuration
├── package.json            # NPM package configuration
└── README.md               # This file
```
*(Note: The `compile.js` script mentioned in previous versions has been removed as Hardhat handles compilation directly.)*

## Quick Start

### Prerequisites
-   Node.js (v18+ recommended)
-   npm (or yarn)

### Setup
1.  **Clone the repository (if applicable) or download the files.**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up environment variables:**
    Create a `.env` file in the project root by copying `.env.example`:
    ```bash
    cp .env.example .env
    ```
    Edit `.env` and provide your:
    -   `PRIVATE_KEY`: Private key for the account deploying the contract.
    -   `RPC_URL`: RPC endpoint for your chosen Ethereum network (e.g., Sepolia).
    -   `ETHERSCAN_API_KEY` (Optional): For contract verification on Etherscan.
    -   `TIER1_THRESHOLD` (Optional, e.g., "0.01"): ETH value for Tier 1.
    -   `TIER2_THRESHOLD` (Optional, e.g., "0.05"): ETH value for Tier 2.

### Compile
```bash
npx hardhat compile
```

### Test
Run the comprehensive test suite:
```bash
npx hardhat test
```

### Deploy
Deploy to a network (e.g., Sepolia, ensure it's configured in [`hardhat.config.js`](TipNFT/hardhat.config.js:0) and your `.env` is set up):
```bash
npx hardhat run scripts/deploy.js --network sepolia
```
The script will output the deployed contract address and attempt Etherscan verification if configured.

## Contract Interaction Overview

-   **Minting**: Send ETH to the `tip()` function or directly to the contract address (via `receive()`).
    -   `<= tier1Threshold` -> Tier 1 NFT
    -   `> tier1Threshold && <= tier2Threshold` -> Tier 2 NFT
    -   `> tier2Threshold` -> Tier 3 NFT
-   **Owner Functions**:
    -   `setTierThresholds(tier1, tier2)`: Update ETH values for tiers.
    -   `setBaseURI(tier, uri)`: Assign metadata URI for each tier.
    -   `setRoyalty(receiver, feeNumerator)`: Configure royalty settings.
    -   `withdraw(payable to)`: Withdraw contract balance.
    -   `pause()` / `unpause()`: Control tipping state.
-   **View Functions**:
    -   `tokenURI(tokenId)`: Get metadata URI for an NFT.
    -   `getOwnedTokens(address owner)`: List NFTs owned by an address.
    -   `totalSupply()`: Get total number of minted NFTs.
    -   `royaltyInfo(tokenId, salePrice)`: Get royalty details for a sale.

## Security
This contract incorporates standard security practices like reentrancy guards and ownership controls. However, **for production use, a professional security audit is highly recommended.**

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file (if one exists, typically MIT allows for this statement directly) or refer to the SPDX identifier in the source files.

---

For more detailed information, please consult the [Full Technical Documentation](docs/DOCUMENTATION.md).
