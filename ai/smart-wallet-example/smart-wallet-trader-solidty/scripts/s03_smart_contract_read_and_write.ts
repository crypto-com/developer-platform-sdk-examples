// Before using this script, the contract must be deployed on L2.
// and the contract address must be defined in the .env file under ERC20_L2_ADDRESS.

// To run:
// npx ts-node scripts/s03_smart_contract_read_and_write.ts

import * as dotenv from "dotenv";
import { Provider as ZkProvider, Wallet as ZkWallet } from "zksync-ethers";
import { TransactionDetails } from "zksync-ethers/build/types";
import { ethers } from "ethers";

dotenv.config();

import MyERC20Token from "../artifacts-zk/contracts/MyERC20Token.sol/MyERC20Token.json";

// Main script
async function main() {
    // Define contract addresses and abi
    const ERC20_L2_ADDRESS = process.env.ERC20_L2_ADDRESS!;
    const ERC20_L2_ABI = MyERC20Token.abi;

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
    const recipient = process.env.WALLET_ADDRESS!;

    // Define empty variables with type
    let amountETH: string;
    let amountWei: bigint;
    let tx: ethers.TransactionResponse | null;
    let txHash: string;
    let txReceipt: ethers.TransactionReceipt | null;
    let txDetails: TransactionDetails | null;
    let txStatus: string;
    let gasUsed: bigint;
    let gasPrice: bigint;
    let txFeeWei: bigint;
    let txFee: string;
    let contract: ethers.Contract;

    // Instantiate the contract
    contract = new ethers.Contract(ERC20_L2_ADDRESS, ERC20_L2_ABI, l2Wallet);

    //
    // Read balance of recipient
    //
    console.log("\nReading balance of recipient: ", recipient, "...");
    amountWei = await contract.balanceOf(recipient);
    amountETH = ethers.formatUnits(amountWei, "ether");
    console.log("Balance of recipient: ", amountETH, "ERC20");

    //
    // Mint tokens to recipient
    //
    console.log("\nMinting ERC20 to recipient: ", recipient, "...");
    amountETH = "0.01";
    amountWei = ethers.parseEther(amountETH);
    // Or, if we only know the ABI of a specific function:
    // contract = new ethers.Contract(ERC20_L2_ADDRESS, ["function mint(address, uint256)"], l2Wallet);
    tx = await contract.mint(recipient, amountWei);
    if (tx) {
        console.log("Transaction created:", tx.hash);
        txReceipt = await tx.wait();
        if (txReceipt) {
            console.log(
                "Transaction included on L2 in block:",
                txReceipt.blockNumber
            );
            gasUsed = txReceipt.gasUsed;
            gasPrice = txReceipt.gasPrice;
            txFeeWei = gasUsed * gasPrice;
            txFee = ethers.formatUnits(txFeeWei, "ether");
            console.log("Transaction fee:", txFee, "zkCRO");
        }
    }

    //
    // THE END FOR NOW
    //
}

main().catch(console.error);
