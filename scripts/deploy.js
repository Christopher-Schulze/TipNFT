const { ethers, network } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log(`\nStarting deployment on network: ${network.name}`);

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const tier1ThresholdDefault = "0.01"; // Default Tier 1 threshold in ETH
  const tier2ThresholdDefault = "0.05"; // Default Tier 2 threshold in ETH

  // Use environment variables for thresholds if provided, otherwise use defaults
  const tier1Value = process.env.TIER1_THRESHOLD || tier1ThresholdDefault;
  const tier2Value = process.env.TIER2_THRESHOLD || tier2ThresholdDefault;

  const tier1 = ethers.parseEther(tier1Value);
  const tier2 = ethers.parseEther(tier2Value);

  console.log(`Tier 1 Threshold set to: ${ethers.formatEther(tier1)} ETH`);
  console.log(`Tier 2 Threshold set to: ${ethers.formatEther(tier2)} ETH`);

  if (tier1 === 0n || tier1 >= tier2) {
    console.error("Error: Invalid tier thresholds. Tier 1 must be > 0 and < Tier 2.");
    process.exit(1);
  }

  const TipNFTFactory = await ethers.getContractFactory("TipNFT");
  
  console.log("Deploying TipNFT contract...");
  const tipNFTContract = await TipNFTFactory.deploy(
    deployer.address, // initialOwner
    tier1,
    tier2
  );

  // Wait for the deployment transaction to be mined
  console.log("Waiting for contract deployment to be confirmed...");
  const deploymentReceipt = await tipNFTContract.waitForDeployment();
  
  // As of ethers v6, the contract instance returned by deploy() is already connected 
  // to the deployed contract address. deploymentReceipt.contractAddress might be undefined or less direct.
  // The address is available directly on the contract instance:
  const contractAddress = await tipNFTContract.getAddress();

  console.log("\n----------------------------------------------------");
  console.log("TipNFT contract successfully deployed!");
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Deployed by: ${deployer.address}`);
  console.log(`Network: ${network.name}`);
  console.log("Transaction Hash:", deploymentReceipt.deploymentTransaction()?.hash); // Accessing deployment transaction hash
  console.log("----------------------------------------------------\n");

  // Optional: Verify contract on Etherscan if API key is set and on a public network
  if (process.env.ETHERSCAN_API_KEY && (network.name === "sepolia" || network.name === "mainnet")) {
    console.log("Attempting to verify contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
          deployer.address,
          tier1,
          tier2,
        ],
      });
      console.log("Contract verification successful.");
    } catch (verifyError) {
      console.error("Contract verification failed:", verifyError.message);
      if (verifyError.message.toLowerCase().includes("already verified")) {
        console.log("Contract may already be verified or source code matches an existing deployment.");
      }
    }
  } else if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Skipping Etherscan verification: ETHERSCAN_API_KEY not set or not on a public network suitable for verification.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
  });
