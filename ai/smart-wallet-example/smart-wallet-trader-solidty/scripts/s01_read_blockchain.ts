// To run:
// npx ts-node scripts/s01_read_blockchain.ts

import * as dotenv from "dotenv";
dotenv.config();

import {
    Wallet as ZkWallet,
    Provider as ZkProvider,
    utils as Zkutils,
} from "zksync-ethers";
import { ethers } from "ethers";

// Main script
async function main() {
    // Define contract addresses
    const TCRO_L1_ADDRESS = process.env.TCRO_L1_ADDRESS!;
    const ZKTCRO_L1_ADDRESS = process.env.ZKTCRO_L1_ADDRESS!;
    const ZKTCRO_L2_ADDRESS = process.env.ZKTCRO_L2_ADDRESS!;

    // Define providers and wallets
    const l1Provider = new ethers.JsonRpcProvider(
        process.env.ETHEREUM_SEPOLIA_URL
    );
    const l2Provider = new ZkProvider(process.env.CRONOS_ZKEVM_TESTNET_URL!);
    const l1Wallet = new ethers.Wallet(
        process.env.WALLET_PRIVATE_KEY!,
        l1Provider
    );
    const l2Wallet = new ZkWallet(
        process.env.WALLET_PRIVATE_KEY!,
        l2Provider,
        l1Provider
    );

    // Check account balances on L1 and L2: ETH on L1, TCRO on L1, ZKTCRO on L1 and L2
    console.log(
        "\nChecking account balances for wallet address: ",
        l1Wallet.address,
        "..."
    );
    const balanceL1ETHWei = await l1Provider.getBalance(l1Wallet.address);
    const balanceL1ETH = ethers.formatUnits(balanceL1ETHWei, "ether");
    console.log("L1 ETH balance: ", balanceL1ETH);
    const balanceL1TCRO_8decimals = await l2Wallet.getBalanceL1(
        TCRO_L1_ADDRESS
    );
    const balanceL1TCRO = ethers.formatUnits(
        balanceL1TCRO_8decimals * ethers.getBigInt("10000000000"),
        "ether"
    );
    console.log("L1 TCRO balance: ", balanceL1TCRO);
    const balanceL1ZKTCROWei = await l2Wallet.getBalanceL1(ZKTCRO_L1_ADDRESS);
    const balanceL1ZKTCRO = ethers.formatUnits(balanceL1ZKTCROWei, "ether");
    console.log("L1 ZKTCRO balance: ", balanceL1ZKTCRO);
    const balanceL2ZKTCROWei = await l2Wallet.getBalance();
    const balanceL2ZKTCRO = ethers.formatUnits(balanceL2ZKTCROWei, "ether");
    console.log("L2 ZKTCRO balance: ", balanceL2ZKTCRO);

    // Read the latest block on L2
    console.log("\nReading the latest block on L2...");
    const latestBlock = await l2Provider.getBlock("latest", true);
    console.log("Latest block: ", latestBlock);

    // Check the status of a transaction on L2
    console.log("\nChecking the status of a transaction on L2...");
    const txHash =
        "0x8760861e4e516543e2b754640d6660192fe969d1c149b5b72cc9b6335bcb0f31";
    console.log("Transaction hash: ", txHash);
    const tx = await l2Provider.getTransaction(txHash);
    console.log("Transaction: ", tx);
    const txReceipt = await l2Provider.getTransactionReceipt(txHash);
    console.log("Transaction receipt: ", txReceipt);
    const txDetails = await l2Provider.getTransactionDetails(txHash);
    console.log("Transaction details: ", txDetails);
    const gasUsed = txReceipt.gasUsed;
    const gasPrice = txReceipt.gasPrice;
    const txFeeWei = gasUsed * gasPrice;
    const txFee = ethers.formatUnits(txFeeWei, "ether");
    console.log("Transaction fee:", txFee, "zkTCRO");
}

main().catch(console.error);
