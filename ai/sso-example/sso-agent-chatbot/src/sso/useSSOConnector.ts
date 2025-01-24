import { create } from 'zustand'
import { createConfig, type CreateConnectorFn, connect, disconnect, getAccount, http, reconnect } from "@wagmi/core";
import { zksyncSsoConnector } from "zksync-sso/connector";
import { zksyncSepoliaTestnet } from "./chains";

const chain = zksyncSepoliaTestnet;
const authServerUrl = "https://auth-test.zksync.dev/confirm";

interface SSOState {
  wagmiConfig: ReturnType<typeof createConfig> | null;
  account: ReturnType<typeof getAccount> | null;
  isConnected: boolean;
  address: string | undefined;
  shortAddress: string | null;
  connectAccount: () => Promise<void>;
  disconnectAccount: () => void;
  initialize: () => void;
}

export const useSSOStore = create<SSOState>((set, get) => ({
  wagmiConfig: null,
  account: null,
  isConnected: false,
  address: undefined,
  shortAddress: null,

  initialize: () => {
    const connector = zksyncSsoConnector({
      authServerUrl,
      session: {
        feeLimit: 0n,
        transfers: [{ to: "0x0000000000000000000000000000000000000000", valueLimit: 0n }]
      },
    });

    const config = createConfig({
      chains: [chain],
      connectors: [connector as CreateConnectorFn],
      transports: { [chain.id]: http() }
    });

    const account = getAccount(config);
    
    set({
      wagmiConfig: config,
      account,
      isConnected: account.isConnected,
      address: account.address,
      shortAddress: account.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : null
    });

    reconnect(config);
  },

  connectAccount: async () => {
    let { wagmiConfig } = get();
    
    // Initialize if not already done
    if (!wagmiConfig) {
      const connector = zksyncSsoConnector({
        authServerUrl,
        session: {
          feeLimit: 0n,
          transfers: [{ to: "0x0000000000000000000000000000000000000000", valueLimit: 0n }]
        },
      });
  
      wagmiConfig = createConfig({
        chains: [chain],
        connectors: [connector as CreateConnectorFn],
        transports: { [chain.id]: http() }
      });
      
      set({ wagmiConfig });
    }

    const connector = zksyncSsoConnector({
      authServerUrl,
      session: {
        feeLimit: 0n,
        transfers: [{ to: "0x0000000000000000000000000000000000000000", valueLimit: 0n }]
      },
    });

    const result = await connect(wagmiConfig, {
      connector,
      chainId: chain.id,
    });
    console.log(result);
    const account = getAccount(wagmiConfig);
    set({
      account,
      isConnected: account.isConnected,
      address: account.address,
      shortAddress: account.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : null
    });
  },

  disconnectAccount: () => {
    const { wagmiConfig } = get();
    if (!wagmiConfig) return;
    
    disconnect(wagmiConfig);
    set({
      account: null,
      isConnected: false,
      address: undefined,
      shortAddress: null
    });
  }
})); 