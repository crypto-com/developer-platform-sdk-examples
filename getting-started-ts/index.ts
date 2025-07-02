import {
  Block,
  Client,
  Contract,
  CronosEvm,
  CronosZkEvm,
  Token,
  Transaction,
  Wallet,
} from '@crypto.com/developer-platform-client';
import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();
// Print out all values of the enum
console.log(`Supported Networks:`);
console.log(`- Cronos EVM mainnet: ${CronosEvm.Mainnet}`);
console.log(`- Cronos EVM testnet: ${CronosEvm.Testnet}`);
console.log(`- Cronos ZK EVM mainnet: ${CronosZkEvm.Mainnet}`);
console.log(`- Cronos ZK EVM testnet: ${CronosZkEvm.Testnet}`);

if (!process.env.DASHBOARD_API_KEY) {
  throw new Error('DASHBOARD_API_KEY is not set');
}

if (!process.env.EXPLORER_API_KEY) {
  console.warn('EXPLORER_API_KEY is not set - some examples will be skipped');
}

// Initialize the client - please ensure you use the correct api key
Client.init({
  apiKey: process.env.DASHBOARD_API_KEY,
});

const ZK_EVM_MAINNET_ADDRESS = '0x23daa69d47C3da7D15bdf311F3a752C4951E17E5'; // Example wallet address
const ZK_EVM_MAINNET_USDC_ADDRESS =
  '0xaa5b845f8c9c047779bedf64829601d8b264076c';
const ZK_EVM_MAINNET_TX_HASH =
  '0xc7e571ef4917cc69887b0bb2b33d94c630a723714007288fd32289a3c0a51b36';

// Block Module
try {
  const blockResponse = await Block.getBlockByTag('latest');
  console.log(
    `[Block] Block information: ${JSON.stringify(
      blockResponse.data.block,
      null,
      2
    )}`
  );
} catch (error) {
  console.error(`[Block] Failed to get block information:`, error instanceof Error ? error.message : String(error));
}

// Contract Module
if (process.env.EXPLORER_API_KEY) {
  try {
    const contractABIResponse = await Contract.getContractABI(
      ZK_EVM_MAINNET_USDC_ADDRESS,
      process.env.EXPLORER_API_KEY
    );
    console.log(
      `[Contract] Contract ABI: ${JSON.stringify(
        contractABIResponse.data.abi,
        null,
        2
      )}`
    );
  } catch (error) {
    console.error(`[Contract] Failed to get contract ABI:`, error instanceof Error ? error.message : String(error));
  }
} else {
  console.log(`[Contract] Skipped - EXPLORER_API_KEY not provided`);
}

// Token Module
try {
  const nativeTokenBalanceResponse = await Token.getNativeTokenBalance(
    ZK_EVM_MAINNET_ADDRESS
  );
  console.log(
    `[Token] Native token balance: ${ethers.formatEther(
      nativeTokenBalanceResponse.data.balance
    )} zkCRO`
  );
} catch (error) {
  console.error(`[Token] Failed to get native token balance:`, error instanceof Error ? error.message : String(error));
}

try {
  const tokenBalanceResponse = await Token.getERC20TokenBalance(
    ZK_EVM_MAINNET_ADDRESS,
    ZK_EVM_MAINNET_USDC_ADDRESS
  );
  console.log(
    `[Token] USDC balance: ${ethers.formatUnits(
      tokenBalanceResponse.data.balance,
      6
    )} USDC`
  );
} catch (error) {
  console.error(`[Token] Failed to get ERC20 token balance:`, error instanceof Error ? error.message : String(error));
}

// Transaction Module
try {
  const transactionResponse = await Transaction.getTransactionByHash(
    ZK_EVM_MAINNET_TX_HASH
  );
  console.log(
    `[Transaction] Transaction information: ${JSON.stringify(
      transactionResponse.data,
      null,
      2
    )}`
  );
} catch (error) {
  console.error(`[Transaction] Failed to get transaction:`, error instanceof Error ? error.message : String(error));
}

// Wallet Module
try {
  const walletCreateResponse = await Wallet.create();
  console.log(`[Wallet] Created wallet: ${walletCreateResponse.data.address}`);

  const walletBalanceResponse = await Wallet.balance(
    walletCreateResponse.data.address
  );
  console.log(`[Wallet] Wallet balance: ${walletBalanceResponse.data.balance}`);
} catch (error) {
  console.error(`[Wallet] Failed to create/check wallet:`, error instanceof Error ? error.message : String(error));
}
