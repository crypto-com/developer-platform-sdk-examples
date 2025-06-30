import { Provider, Wallet } from "zksync-ethers";
import * as hre from "hardhat";
import { Deployer } from "@matterlabs/hardhat-zksync";
import dotenv from "dotenv";
import { ethers } from "ethers";

import "@matterlabs/hardhat-zksync-node/dist/type-extensions";
import "@matterlabs/hardhat-zksync-verify/dist/src/type-extensions";

// Load env file
dotenv.config();

export const getProvider = () => {
  const rpcUrl = hre.network.config.url;
  if (!rpcUrl)
    throw `RPC URL wasn't found in "${hre.network.name}"! Please add a "url" field to the network config in hardhat.config.ts`;

  // Initialize ZKsync Provider
  const provider = new Provider(rpcUrl);

  return provider;
};

export const getWallet = (privateKey?: string) => {
  if (!privateKey) {
    // Get wallet private key from .env file
    if (!process.env.WALLET_PRIVATE_KEY)
      throw "Wallet private key wasn't found in .env file!";
  }

  const provider = getProvider();

  // Initialize ZKsync Wallet
  const wallet = new Wallet(
    privateKey ?? process.env.WALLET_PRIVATE_KEY!,
    provider
  );

  return wallet;
};

export const verifyEnoughBalance = async (wallet: Wallet, amount: bigint) => {
  // Check if the wallet has enough balance
  const balance = await wallet.getBalance();
  if (balance < amount)
    throw `Wallet balance is too low! Required ${ethers.formatEther(
      amount
    )} ETH, but current ${wallet.address} balance is ${ethers.formatEther(
      balance
    )} ETH`;
};

/**
 * @param {string} data.contract The contract's path and name. E.g., "contracts/Greeter.sol:Greeter"
 */
export const verifyContract = async (data: {
  address: string;
  contract: string;
  constructorArguments: string;
  bytecode: string;
}) => {
  const verificationRequestId: number = await hre.run("verify:verify", {
    ...data,
    noCompile: true,
  });
  return verificationRequestId;
};

type DeployContractOptions = {
  /**
   * If true, the deployment process will not print any logs
   */
  silent?: boolean;
  /**
   * If true, the contract will not be verified on Block Explorer
   */
  noVerify?: boolean;
  /**
   * If specified, the contract will be deployed using this wallet
   */
  wallet?: Wallet;
};
export const deployContract = async (
  contractArtifactName: string,
  constructorArguments?: any[],
  options?: DeployContractOptions
) => {
  const log = (message: string) => {
    if (!options?.silent) console.log(message);
  };

  log(`\nStarting deployment process of "${contractArtifactName}"...`);

  const wallet = options?.wallet ?? getWallet();
  const deployer = new Deployer(hre, wallet);
  const artifact = await deployer
    .loadArtifact(contractArtifactName)
    .catch((error) => {
      if (
        error?.message?.includes(
          `Artifact for contract "${contractArtifactName}" not found.`
        )
      ) {
        console.error(error.message);
        throw `Please make sure you have compiled your contracts or specified the correct contract name!`;
      } else {
        throw error;
      }
    });

  // Estimate contract deployment fee
  const deploymentFee = await deployer.estimateDeployFee(
    artifact,
    constructorArguments || []
  );
  log(`Estimated deployment cost: ${ethers.formatEther(deploymentFee)} ETH`);

  // Check if the wallet has enough balance
  await verifyEnoughBalance(wallet, deploymentFee);

  // Deploy the contract to ZKsync
  const contract = await deployer.deploy(artifact, constructorArguments);
  const address = await contract.getAddress();
  const constructorArgs = contract.interface.encodeDeploy(constructorArguments);
  const fullContractSource = `${artifact.sourceName}:${artifact.contractName}`;

  // Display contract deployment info
  log(`\n"${artifact.contractName}" was successfully deployed:`);
  log(` - Contract address: ${address}`);
  log(` - Contract source: ${fullContractSource}`);
  log(` - Encoded constructor arguments: ${constructorArgs}\n`);

  if (!options?.noVerify && hre.network.config.verifyURL) {
    log(`Requesting contract verification...`);
    const error = await verifyContract({
      address,
      contract: fullContractSource,
      constructorArguments: constructorArgs,
      bytecode: artifact.bytecode,
    });

    log(` - error: ${error}`);
  }

  return contract;
};

export const deployAccount = async (
  contractArtifactName: string,
  constructorArguments?: any[],
  options?: DeployContractOptions
) => {
  const log = (message: string) => {
    if (!options?.silent) console.log(message);
  };

  log(`\nStarting deployment process of "${contractArtifactName}"...`);

  const wallet = options?.wallet ?? getWallet();
  const deployer = new Deployer(hre, wallet);
  const artifact = await deployer
    .loadArtifact(contractArtifactName)
    .catch((error) => {
      if (
        error?.message?.includes(
          `Artifact for contract "${contractArtifactName}" not found.`
        )
      ) {
        console.error(error.message);
        throw `Please make sure you have compiled your contracts or specified the correct contract name!`;
      } else {
        throw error;
      }
    });

  // Estimate contract deployment fee
  const deploymentFee = await deployer.estimateDeployFee(
    artifact,
    constructorArguments || []
  );
  log(`Estimated deployment cost: ${ethers.formatEther(deploymentFee)} ETH`);

  // Check if the wallet has enough balance
  await verifyEnoughBalance(wallet, deploymentFee);

  // Deploy the contract to ZKsync
  const contract = await deployer.deploy(
    artifact,
    constructorArguments,
    "createAccount"
  );
  const address = await contract.getAddress();
  const constructorArgs = contract.interface.encodeDeploy(constructorArguments);
  const fullContractSource = `${artifact.sourceName}:${artifact.contractName}`;

  // Display contract deployment info
  log(`\n"${artifact.contractName}" was successfully deployed:`);
  log(` - Contract address: ${address}`);
  log(` - Contract source: ${fullContractSource}`);
  log(` - Encoded constructor arguments: ${constructorArgs}\n`);

  if (!options?.noVerify && hre.network.config.verifyURL) {
    log(`Requesting contract verification...`);
    await verifyContract({
      address,
      contract: fullContractSource,
      constructorArguments: constructorArgs,
      bytecode: artifact.bytecode,
    });
  }

  return contract;
};

/**
 * Rich wallets can be used for testing purposes.
 * Available on ZKsync In-memory node and Dockerized node.
 */
export const LOCAL_RICH_WALLETS = [
  {
    address: process.env.ADDRESS_ONE,
    privateKey: process.env.PK_ONE,
  },
  {
    address: process.env.ADDRESS_TWO,
    privateKey: process.env.PK_TWO,
  },
  {
    address: process.env.ADDRESS_THREE,
    privateKey: process.env.PK_THREE,
  },
  {
    address: process.env.ADDRESS_FOUR,
    privateKey: process.env.PK_FOUR,
  },
  {
    address: process.env.ADDRESS_FIVE,
    privateKey: process.env.PK_FIVE,
  },
  {
    address: process.env.ADDRESS_SIX,
    privateKey: process.env.PK_SIX,
  },
  {
    address: process.env.ADDRESS_SEVEN,
    privateKey: process.env.PK_SEVEN,
  },
  {
    address: process.env.ADDRESS_EIGHT,
    privateKey: process.env.PK_EIGHT,
  },
  {
    address: process.env.ADDRESS_NINE,
    privateKey: process.env.PK_NINE,
  },
  {
    address: process.env.ADDRESS_TEN,
    privateKey: process.env.PK_TEN,
  },
];
