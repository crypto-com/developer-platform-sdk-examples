import { createConfig } from "@wagmi/core";
import { Address, http } from "viem";
import { zksyncSepoliaTestnet } from "viem/chains";
import { PasskeyRequiredContracts } from "zksync-sso/client/passkey";

// export const cronoszkEVMTestnet = defineChain({
//   id: 7001,
//   name: "Cronos zkEVM Testnet",
//   network: "cronos-zkevm-testnet",
//   nativeCurrency: {
//     decimals: 18,
//     name: "Cronos",
//     symbol: "CRO",
//   },
//   rpcUrls: {
//     default: { http: ["https://rpc-zkevm-t.cronos.org"] },
//     public: { http: ["https://rpc-zkevm-t.cronos.org"] },
//   },
//   blockExplorers: {
//     default: { name: "CronosScan", url: "https://zkevm-t.cronoscan.com" },
//   },
//   testnet: true,
// });

export const CHAIN = zksyncSepoliaTestnet;

export const WagmiConfig = createConfig({
  chains: [CHAIN],
  transports: { [CHAIN.id]: http() }
});

type ChainContracts = PasskeyRequiredContracts & {
  accountFactory: NonNullable<PasskeyRequiredContracts["accountFactory"]>;
  accountPaymaster: Address;
};

export const CONTRACTS: ChainContracts = {
  session: "0x64Bf5C3229CafF50e39Ec58C4BFBbE67bEA90B0F",
  passkey: "0x0F65cFE984d494DAa7165863f1Eb61C606e45fFb",
  accountFactory: "0x73CFa70318FD25F2166d47Af9d93Cf72eED48724",
  accountPaymaster: "0xA46D949858335308859076FA605E773eB679e534",
}; 