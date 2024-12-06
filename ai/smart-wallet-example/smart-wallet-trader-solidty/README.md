# Cronos zkEVM Hardhat Demo Repository

The goal of this repository is to demonstrate basic use of Cronos zkEVM to develop smart contract and implement on-chain transactions.

# Set-up

This repository uses Node 20 with Typescript and the following packages:

-   zksync-ethers (v6.9.0) together with ethers (v6) (
    see https://docs.zksync.io/build/sdks/js/zksync-ethers/getting-started.html)
-   hardhat (see https://docs.zksync.io/build/tooling/hardhat/migrating-to-zksync.html)

It was created using a standard hardhat project (https://hardhat.org/hardhat-runner/docs/guides/project-setup), and then migrated to be compatible with ZK Stack using the instructions described in the ZK Sync documentation ("migration guide").

IMPORTANT: See `package.json` for the full list of dependencies. (In particular, requires @matterlabs/hardhat-zksync-verify for contract verification).

To install the dependencies of this repository, type `npm install`.

The zksync-ethers package is constantly moving and unfortunately, this means that this repository may present dependency conflicts over time. At the time of writing, `npm install` returns some warnings but no errors. Pay attention to the version numbers in `package.json` if you are trying to recreate this project at home.

# Basic blockchain reading and writing operations

You can find the Cronos zkEVM testnet blockchain explorer at: https://explorer.zkevm.cronos.org/testnet/.

The basic reading and writing scripts are in the /scripts folder:

-   s01_read_blockchain.ts: read wallet balances, blocks and transactions.
-   s02_basic_transactions.ts: transfer zkTCRO, deposit zkTCRO from L1 to L2, withdraw zkTCRO from L2 to L1.

# Smart contract development

## Hardhat config

See hardhat.config.ts for settings.

For example, the settings for the Cronos zkEVM testnet network are as follows:

```json lines
{
    "cronosZkEvmTestnet": {
        "url": "https://testnet.zkevm.cronos.org",
        "ethNetwork": "sepolia",
        // or a Sepolia RPC endpoint from Infura/Alchemy/Chainstack etc.
        "zksync": true,
        "verifyURL": "https://explorer-api.testnet.zkevm.cronos.org/api/v1/contract/verify/hardhat?apikey={api_key}"
    }
}
```

In order to obtain an API key for contract verification, please visit the Cronos zkEVM Developer Portal at: [https://developers.zkevm.cronos.org/](https://developers.zkevm.cronos.org/).

Alternatively, you can verify contracts by visiting the user interface at [https://explorer.zkevm.cronos.org/testnet/verifyContract](https://explorer.zkevm.cronos.org/testnet/verifyContract).

## Compilation and deployment

The smart contracts in this repository are written in Solidity and are based on the OpenZeppelin library. Considering
that `@matterlabs/hardhat-zksync-upgradable` does not currently support OpenZeppelin libraries above v4.9.5, we are only
using `@openzeppelin/contracts-upgradeable@4.9.5` and `@openzeppelin/contracts@4.9.5`.

To compile all the contracts in the /contracts directory, run:

```shell
npx hardhat compile --network cronosZkEvmMainnet
```

To deploy and verify the contract, run:

```shell
# Deploy to testnet and verify
npx hardhat deploy-zksync --script deployAndVerifyMyERC20Token.ts --network cronosZkEvmTestnet

# Deploy to mainnet and verify
npx hardhat deploy-zksync --script deployAndVerifyMyERC20Token.ts --network cronosZkEvmMainnet
```

# Interacting with the deployed contract

A basic reading and writing script is included in the /scripts folder:

-   s03_smart_contract_read_and_write.ts: read contract, write contract.

# Issues with contract verification

If you develop a smart contract, it is imperative that the smart contract should be verified in the blockchain explorer, which is:

-   For mainnet: https://explorer.zkevm.cronos.org/
-   For testnet: https://explorer.zkevm.cronos.org/testnet

## Deploy and verify at the same time

This is the most recommended path, by far. Please refer to the script provided at `./deployt/deployAndVerifyMyERC20Token.ts`.

## Deploy, then verify via script

This the next recommended path.

To try it, you can:

-   Perform the deployment with the script `./deploy/deployOnlyMyERC20Token.ts`
-   Perform the verification with the script `./deploy/verifyOnlyMyERC20Token.ts`

The corresponding CLI commands are:

```shell
# Deployment to mainnet
npx hardhat deploy-zksync --script deployOnlyMyERC20Token.ts --network cronosZkEvmMainnet

# Verification on mainnet
npx hardhat deploy-zksync --script verifyOnlyMyERC20Token.ts --network cronosZkEvmMainnet
```

When performing verification, you may get the following warning:

```
Compiling your contract excluding unrelated contracts did not produce identical bytecode.
Trying again with the full solc input used to compile and deploy it.
This means that unrelated contracts may be displayed on the zksync block explorer.
```

This is because the hardhat.config.ts file has `bytecodeHash: "none"` under zksolc compilation metadata settings.

## Deploy, then verify via user interface

The user interface for contract verification is at the following URL:

-   Mainnet: https://explorer.zkevm.cronos.org/verifyContract
-   Testnet: https://explorer.zkevm.cronos.org/testnet/verifyContract

In order to verify a contract that is already deployed, you need to following the steps described below. The steps are for mainnet.

First, compile the contract with:

```shell
npx hardhat compile --network cronosZkEvmMainnet
```

In the project directory, go to `./artifacts-zk/build-info` and find your contract's JSON file, which should have a file name generated by the compiler, such as `ca89ad1a8ab85e6eec3e23f189ae9054.json`. Open the file. If you have a JSON formatter installed in your IDE, you can use it on the file in order to read it more easily.

Copy the entire contents of the `input` object of the JSON file, and paste it into a new JSON file. In this repository, the file `./deploy/examplePayloadForManualVerification.json` is an example of such new JSON file.

Visit https://explorer.zkevm.cronos.org/verifyContract and complete the following information:

-   Contract name: this is the name of the contract in the .sol file. With this example, it's `MyERC20Token`
-   Contract path: With this example, it's `contracts/MyERC20Token.sol`
-   Contract address: address where the contract is already deployed.
-   Compiler type: select `Solidity Standard-Json-Input` (heads up, that's not the default option!)
-   Compiler version: with this example, it's 0.8.24. The compiler version should be taken from the artifacts-zk/build-info/xxx.json file where it's referred to as solcVersion. If the format is something like zkVM-0.8.20-1.0.1, it means that you need to select a zkVM version. Before zksolc 1.5.0 (where zksolc is the ZKsync compiler, see below), the compiler version is the same as the solidity version. From zksolc 1.5.0 onward, the compiler version will be in the zkVM-{solidity_version}-{era_version} format.
-   ZKsync compiler version (zksolc): with this example, it's 1.5.3
-   Optimizer Enabled: with this example, it's true (see hardhat.config.ts)
-   Constructor arguments: with this example, it's empty. Otherwise, the constructor arguments must be encoded.
-   Contract files: with this example, it's `./deploy/examplePayloadForManualVerification.json`
-   Agree to terms and conditions, click "I'm not a robot" and submit.

After submission, the contract should be verified in a few minutes. If it is not verified after 10 minutes, it means that there is an issue.

Note: the Era version is usually set automatically, but it's possible to define it manually. See https://github.com/matter-labs/hardhat-zksync/blob/main/examples/basic-example/hardhat.config.ts#L33.

## Troublshooting

If you are still having issues with contract verification in the blockchain explorer, here are a few pointers.

-   Check with Cronos Labs that your solidity and zksolc versions are supported (should be up to the versions used in this repo)
-   Make sure that you have registered for an API key and have added the key to the .env variables.
-   Deploy your smart contract with no constructor arguments (i.e. hard code the constructor values in the .sol file), as constructor arguments can sometimes be tricky to encode.
-   Delete the `artifacts-zk`, `cache-zk`, `deployments-zk` and `typechain-types` directories every time that you change the smart contract code.

# Going further

Now that you have seen a few working examples of using Cronos zkEVM, you should be able to translate the zkSync
documentation into Cronos zkEVM code.

For the zkSync documentation, refer to: https://docs.zksync.io/build/sdks/js/zksync-ethers/getting-started.html
