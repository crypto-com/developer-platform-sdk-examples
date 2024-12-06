// To run:
// npx ts-node scripts/s02_basic_transactions.ts

import * as dotenv from "dotenv";
import { Provider as ZkProvider, Wallet as ZkWallet } from "zksync-ethers";
import { TransactionDetails } from "zksync-ethers/build/types";
import { ethers } from "ethers";

dotenv.config();

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

    //
    // Send zkTCRO to recipient
    // In the zksync-ethers library, for convenience, the Wallet class has a transfer method,
    // which can transfer ETH or any ERC20 token within the same interface.
    //
    // console.log("\nSending zkTCRO to recipient: ", recipient, "...")
    // amountETH = "0.01";
    // amountWei = ethers.parseEther(amountETH);
    // tx = await l2Wallet.transfer({to: recipient, amount: amountWei});
    // console.log("Transaction created:", tx.hash);
    // txReceipt = await tx.wait();
    // if (txReceipt) {
    //     console.log("Transaction included on L2 in block:", txReceipt.blockNumber);
    //     gasUsed = txReceipt.gasUsed;
    //     gasPrice = txReceipt.gasPrice;
    //     txFeeWei = gasUsed * gasPrice;
    //     txFee = ethers.formatUnits(txFeeWei, "ether");
    //     console.log("Transaction fee:", txFee, "zkCRO");
    // }

    //
    // Deposit zkTCRO from L1 to L2
    //
    // console.log("\nDepositing zkTCRO from L1 to L2...");
    // amountETH = "0.01";
    // amountWei = ethers.parseEther(amountETH);
    // tx = await l2Wallet.deposit({
    //     token: ZKTCRO_L1_ADDRESS,
    //     amount: amountWei,
    //     to: recipient,
    //     approveERC20: true,
    //     approveBaseERC20: true
    // });
    // txHash = tx.hash;
    // console.log("Transaction created:", txHash);
    // txReceipt = await tx.wait();
    // if (tx && txReceipt) {
    //     console.log("Transaction included on L1 in block:", txReceipt.blockNumber);
    //     gasUsed = txReceipt.gasUsed;
    //     gasPrice = txReceipt.gasPrice;
    //     txFeeWei = gasUsed * gasPrice;
    //     txFee = ethers.formatUnits(txFeeWei, "ether");
    //     console.log("Transaction fee:", txFee, "ETH");
    //     console.log("Retrieving the corresponding L2 transaction...");
    //     let keepWaiting = true;
    //     while (keepWaiting) {
    //         try {
    //             await new Promise(resolve => setTimeout(resolve, 15000));
    //             // Finding the corresponding L2 transaction
    //             tx = await l1Provider.getTransaction(txHash);
    //             if (tx) {
    //                 const l2TxResponse =
    //                     await l2Provider.getL2TransactionFromPriorityOp(tx);
    //                 if (l2TxResponse) {
    //                     console.log("l2TxResponse hash: ", l2TxResponse.hash);
    //                     keepWaiting = false;
    //                 }
    //                 keepWaiting = false;
    //             }
    //         } catch (e) {
    //             // console.error(e);
    //             console.log("Could not retrieve the L2 transaction yet... will keep trying ...");
    //         }
    //     }
    // }

    //
    // Withdraw zkTCRO from L2 to L1
    //
    // console.log("\nWithdrawing zkTCRO from L2 to L1...");
    // amountETH = "0.01";
    // amountWei = ethers.parseEther(amountETH);
    // console.log("Initiate withdrawal...");
    // tx = await l2Wallet.withdraw({
    //     token: ZKTCRO_L2_ADDRESS,
    //     amount: amountWei,
    //     to: recipient,
    // });
    // txHash = tx.hash;
    // console.log("Transaction created:", txHash);
    // txReceipt = await tx.wait();
    // if (tx && txReceipt) {
    //     console.log("Transaction included on L2 in block:", txReceipt.blockNumber);
    //     gasUsed = txReceipt.gasUsed;
    //     gasPrice = txReceipt.gasPrice;
    //     txFeeWei = gasUsed * gasPrice;
    //     txFee = ethers.formatUnits(txFeeWei, "ether");
    //     console.log("Transaction fee:", txFee, "zkCRO");
    //     console.log("It will take a while before the withdrawal can be finalized on L1." +
    //         " In transactionDetails, the status must be 'verified' before the withdrawal can be finalized on L1");
    // }

    //
    // Finalize zkCRO withdrawal on L1
    // This part of the code can only be called after a while, so the transaction Hash is hardcoded manually below
    //
    // txHash = "0x66411866dc3479cc8d8f76e6bb457b95752757f8080e8bfb4e35db5981e6b81d";
    // console.log("\nFinalizing zkTCRO withdrawal on L1...");
    // console.log("First, we need to check the status of the transaction on L2...");
    // console.log("Transaction hash: ", txHash);
    // tx = await l2Provider.getTransaction(txHash);
    // txDetails = await l2Provider.getTransactionDetails(txHash);
    // if (txDetails) {
    //     txStatus = txDetails.status;
    //     console.log("Transaction status: ", txDetails.status);
    //     if (txStatus == "verified") {
    //         console.log("Transaction is verified on L1. Finalizing withdrawal...");
    //         tx = await l2Wallet.finalizeWithdrawal(txHash);
    //         console.log("Transaction created:", tx.hash);
    //         txReceipt = await tx.wait();
    //         if (txReceipt) {
    //             console.log("Transaction included on L1 in block:", txReceipt.blockNumber);
    //         }
    //     }
    // }

    //
    // THE END FOR NOW
    //
}

main().catch(console.error);
