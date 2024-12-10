import { HardhatUserConfig } from "hardhat/config";

import "@matterlabs/hardhat-zksync";

import * as dotenv from "dotenv";

dotenv.config();

const cronos_zkevm_testnet_apikey: string = <string>(
  process.env.CRONOS_ZKEVM_DEVELOPER_PORTAL_TESTNET_API_KEY
);

const config: HardhatUserConfig = {
  defaultNetwork: "CronoszkEVMTestnet",
  networks: {
    CronoszkEVMTestnet: {
      url: "https://testnet.zkevm.cronos.org",
      ethNetwork: "sepolia",
      zksync: true,
    },
  },
  zksolc: {
    version: "1.5.3",
    settings: {
      isSystem: true,
    },
  },
  solidity: {
    version: "0.8.17",
  },
};

export default config;
