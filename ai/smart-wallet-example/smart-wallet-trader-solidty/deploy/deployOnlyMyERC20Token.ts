// To run:
// npx hardhat deploy-zksync --script deployMyERC20Token.ts --network cronosZkEvmTestnet

import * as dotenv from "dotenv";
import { Provider as ZkProvider, Wallet as ZkWallet } from "zksync-ethers";
import { ethers } from "ethers";

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer as ZkDeployer } from "@matterlabs/hardhat-zksync";

// Used to access the ABI in case we just want to verify the contract
const CONTRACT_ARTIFACT = require("../artifacts-zk/contracts/MyERC20Token.sol/MyERC20Token.json");

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

    // BEGINNING OF DEPLOYMENT

    // Estimate contract deployment fee
    let deploymentFeeWei = await l2Deployer.estimateDeployFee(
        artifact,
        constructorArguments
    );

    // Gross up deploymentFee Bigint by a multiplier, if needed to avoid "out of gas" errors. The result must be a bigint
    deploymentFeeWei = (deploymentFeeWei * BigInt(100)) / BigInt(100);

    console.log(
        `Estimated deployment cost: ${ethers.formatEther(
            deploymentFeeWei
        )} ZKCRO`
    );

    // Check if the wallet has enough balance
    const balance = await l2Wallet.getBalance();
    if (balance < deploymentFeeWei)
        throw `Wallet balance is too low! Required ${ethers.formatEther(
            deploymentFeeWei
        )} ETH, but current ${l2Wallet.address} balance is ${ethers.formatEther(
            balance
        )} ETH`;

    // Deploy this contract. The returned object will be of a `Contract` type,
    // similar to the ones in `ethers`.
    const l2Contract = await l2Deployer.deploy(artifact, constructorArguments);
    const address = await l2Contract.getAddress();

    // END OF DEPLOYMENT

    const constructorArgs =
        l2Contract.interface.encodeDeploy(constructorArguments);
    const fullContractSource = `${artifact.sourceName}:${artifact.contractName}`;

    // Display contract deployment info
    console.log(`\n"${artifact.contractName}" was successfully deployed:`);
    console.log(` - Contract address: ${address}`);
    console.log(` - Contract source: ${fullContractSource}`);
    console.log(` - Encoded constructor arguments: ${constructorArgs}\n`);
}
