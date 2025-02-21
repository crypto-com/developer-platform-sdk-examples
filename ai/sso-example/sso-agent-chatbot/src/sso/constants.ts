import { createConfig } from "@wagmi/core";
import { Address, defineChain, http } from "viem";
import { chainConfig } from "viem/zksync";
import { PasskeyRequiredContracts } from "zksync-sso/client/passkey";
// import { zksyncSsoConnector } from "zksync-sso/connector";

export const cronoszkEVMLocal = defineChain({
  ...chainConfig,
  id: 272,
  name: "Cronos zkEVM Local",
  nativeCurrency: {
    decimals: 18,
    name: "Cronos zkEVM Local Coin",
    symbol: "zkTCRO",
  },
  rpcUrls: {
    default: { http: ["http://localhost:3150"] },
  },
  blockExplorers: {
    default: {
      name: "Cronos zkEVM Testnet Explorer",
      url: "https://explorer.zkevm.cronos.org/testnet/",
    },
    native: {
      name: "Cronos zkEVM Testnet Explorer",
      url: "https://explorer.zkevm.cronos.org/testnet/",
    },
  },
  testnet: true,
});

export const cronoszkEVMTestnet = defineChain({
  ...chainConfig,
  id: 240,
  name: "Cronos zkEVM Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Cronos zkEVM Test Coin",
    symbol: "zkTCRO",
  },
  rpcUrls: {
    default: { http: ["https://seed.testnet.zkevm.cronos.org/"] },
  },
  blockExplorers: {
    default: {
      name: "Cronos zkEVM Testnet Explorer",
      url: "https://explorer.zkevm.cronos.org/testnet/",
    },
    native: {
      name: "Cronos zkEVM Testnet Explorer",
      url: "https://explorer.zkevm.cronos.org/testnet/",
    },
  },
  testnet: true,
});


export const CHAIN = cronoszkEVMTestnet;

// const connector = zksyncSsoConnector({
//   authServerUrl: "https://auth-test.zksync.io",
// });

export const WagmiConfig = createConfig({
  chains: [CHAIN],
  // connectors: [connector],
  transports: { [CHAIN.id]: http() }
});

type ChainContracts = PasskeyRequiredContracts & {
  accountFactory: NonNullable<PasskeyRequiredContracts["accountFactory"]>;
  accountPaymaster: Address;
};

// zksync sepolia
// export const CONTRACTS: ChainContracts = {
//   session: "0x64Bf5C3229CafF50e39Ec58C4BFBbE67bEA90B0F",
//   passkey: "0x0F65cFE984d494DAa7165863f1Eb61C606e45fFb",
//   accountFactory: "0x73CFa70318FD25F2166d47Af9d93Cf72eED48724",
//   accountPaymaster: "0xA46D949858335308859076FA605E773eB679e534",
// }; 

// cronos zkevm testnet
export const CONTRACTS: ChainContracts = {
  session: "0xfebC82bBFC6FB8666AC45fa8a601DfA34Ce30710",
  passkey: "0x0A019BD60E42b9d18413C710992B96E69dFFC5A0",
  accountFactory: "0x381539B4FC39eAe0Eb848f52cCA93F168a0e955D",
  accountPaymaster: "0xA7B450E91Bc126aa93C656750f9c940bfdc2f1e9",
}; 


// cronos zkevm local
// export const CONTRACTS: ChainContracts = {
//   session: "0xaE6550EDfC85493672f328a3175AcC0018888643",
//   passkey: "0x0A019BD60E42b9d18413C710992B96E69dFFC5A0",
//   accountFactory: "0xa91809af8EDbd01A49d6c08247AC4444Ae4f634b",
//   accountPaymaster: "0x5b4a20361De4e285800901EDdfec7153e614bf77",
// }; 