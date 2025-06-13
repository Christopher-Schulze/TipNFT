require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      // Configuration for the local Hardhat Network
    },
    sepolia: {
      url: process.env.RPC_URL || "", // Ensure your .env file has RPC_URL for Sepolia
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      // gasPrice: 20000000000, // Optional: set a specific gas price
    },
    // Add other networks like mainnet if needed
    // mainnet: {
    //   url: process.env.MAINNET_RPC_URL || "",
    //   accounts: process.env.MAINNET_PRIVATE_KEY ? [process.env.MAINNET_PRIVATE_KEY] : [],
    // }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "", // Your Etherscan API key for contract verification
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || "", // Optional: for USD conversion
    // outputFile: "gas-report.txt", // Optional: to save report to a file
    // noColors: true, // Optional: if outputting to a file
  },
  paths: {
    sources: "./contracts",
    tests: "./test", // Assuming tests are in a 'test' directory
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000 // Timeout for tests, can be increased if tests are long
  }
};
