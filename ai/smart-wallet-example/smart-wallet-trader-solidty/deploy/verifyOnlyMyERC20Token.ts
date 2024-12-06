// To run:
// npx hardhat deploy-zksync --script deployMyERC20Token.ts --network cronosZkEvmTestnet

import * as dotenv from "dotenv";
import { Provider as ZkProvider, Wallet as ZkWallet } from "zksync-ethers";
import { ethers } from "ethers";

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer as ZkDeployer } from "@matterlabs/hardhat-zksync";

// Used to access the ABI in case we just want to verify the contract
const CONTRACT_ARTIFACT = require("../artifacts-zk/contracts/WBTC.sol/WBTC.json");

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

    // Address of the contract already deployed
    const address = "0x8A4C5552ee1E96C195BADC7226e1D38F7CE9405b";
    const l2Contract = new ethers.Contract(
        address,
        CONTRACT_ARTIFACT.abi,
        l2Provider
    );

    const constructorArgs =
        l2Contract.interface.encodeDeploy(constructorArguments);
    const fullContractSource = `${artifact.sourceName}:${artifact.contractName}`;

    // Display contract deployment info
    console.log(
        `\n"${artifact.contractName}" : Preparing to request verification...`
    );
    console.log(` - Contract address: ${address}`);
    console.log(` - Contract source: ${fullContractSource}`);
    console.log(` - Encoded constructor arguments: ${constructorArgs}\n`);

    console.log(`Requesting contract verification...`);
    const verificationData = {
        address,
        contract: fullContractSource,
        constructorArguments: constructorArgs,
        bytecode: artifact.bytecode,
    };
    const verificationRequestId: number = await hre.run("verify:verify", {
        ...verificationData,
        noCompile: true,
    });
    console.log("Verification request id:", verificationRequestId);
}
