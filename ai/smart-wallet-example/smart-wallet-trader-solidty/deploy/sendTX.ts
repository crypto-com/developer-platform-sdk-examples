// To run:
// npx hardhat deploy-zksync --script deployMyERC20Token.ts --network cronosZkEvmTestnet

import * as dotenv from "dotenv";
import { Provider as ZkProvider, Wallet as ZkWallet } from "zksync-ethers";
import { ethers } from "ethers";

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer as ZkDeployer } from "@matterlabs/hardhat-zksync";

// Used to access the ABI in case we just want to verify the contract
// const CONTRACT_ARTIFACT = require("../artifacts-zk/contracts/MyERC20Token.sol/MyERC20Token.json");

dotenv.config();

interface MyNetworkConfig {
  url: string;
  ethNetwork: string;
}

export default async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script`);

  console.log("\nConnecting to blockchain network...");
  const networkConfig = hre.network.config as MyNetworkConfig;
  console.log("The chosen network config is:", networkConfig);
  const l1Provider = new ethers.JsonRpcProvider(networkConfig.ethNetwork!);
  const l2Provider = new ZkProvider(networkConfig.url!);
  const l2Network = await l2Provider.getNetwork();
  console.log("Connected to network ID", l2Network.chainId.toString());
  const latestL2Block = await l2Provider.getBlockNumber();
  console.log("Latest network block", latestL2Block);

  // Initialize the wallet
  const l2Wallet = new ZkWallet(
    process.env.WALLET_PRIVATE_KEY!,
    l2Provider,
    l1Provider
  );

  // Create deployer object and load the artifact of the contract we want to deploy.
  const l2Deployer = new ZkDeployer(hre, l2Wallet);

  // Load contract
  const artifact = await l2Deployer.loadArtifact("WBTC");
  const constructorArguments: any[] = [];

  // Connect to existing WBTC contract
  const wbtcAddress = "0x8A4C5552ee1E96C195BADC7226e1D38F7CE9405b";
  const wbtcContract = new ethers.Contract(wbtcAddress, artifact.abi, l2Wallet);

  // Prepare and send swap transaction
  const amountToSwap = ethers.parseEther("0.01"); // Adjust amount as needed
  const tx = await wbtcContract.swap({
    value: amountToSwap, // Send ETH equal to amountToSwap
  });
  console.log("Swap transaction hash:", tx.hash);

  // Wait for transaction confirmation
  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);
}
