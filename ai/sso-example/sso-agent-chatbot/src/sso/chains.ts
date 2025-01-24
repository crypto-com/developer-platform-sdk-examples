import { defineChain } from "viem";

import { zksyncSepoliaTestnet } from "viem/chains";

export { zksyncSepoliaTestnet };

export const cronoszkEVMTestnet = defineChain({
  id: 7001,
  name: "Cronos zkEVM Testnet",
  network: "cronos-zkevm-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Cronos",
    symbol: "CRO",
  },
  rpcUrls: {
    default: { http: ["https://rpc-zkevm-t.cronos.org"] },
    public: { http: ["https://rpc-zkevm-t.cronos.org"] },
  },
  blockExplorers: {
    default: { name: "CronosScan", url: "https://zkevm-t.cronoscan.com" },
  },
  testnet: true,
});

export const cronoszkEVMLocal = defineChain({
  id: 7002,
  name: "Cronos zkEVM Local",
  network: "cronos-zkevm-local",
  nativeCurrency: {
    decimals: 18,
    name: "Cronos",
    symbol: "CRO",
  },
  rpcUrls: {
    default: { http: ["http://localhost:8545"] },
    public: { http: ["http://localhost:8545"] },
  },
  testnet: true,
}); 