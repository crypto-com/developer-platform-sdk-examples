import { ethers } from "ethers";
import { Provider as ZkProvider } from "zksync-ethers";
import * as dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file

async function checkBalance() {
  try {
    // Replace with your provider URL (e.g., Infura, Alchemy, or zkSync node)
    const provider = new ZkProvider("https://testnet.zkevm.cronos.org");

    // Wallet address or private key
    const walletPrivateKey = process.env.DEPLOYER_WALLET_PRIVATE_KEY!;
    const wallet = new ethers.Wallet(walletPrivateKey, provider);

    // Fetch balance
    const balanceWei = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balanceWei);

    console.log(`Wallet Address: ${wallet.address}`);
    console.log(`Balance: ${balanceEth} ETH`);
  } catch (error) {
    console.error("Error checking balance:", error);
  }
}

checkBalance();
