import { create } from 'zustand'
import { createConfig, type CreateConnectorFn, getAccount, http, reconnect } from "@wagmi/core";
import { zksyncSsoConnector } from "zksync-sso/connector";
import { Address, createPublicClient, createWalletClient, Hex, publicActions, walletActions, toHex, Chain, Transport } from 'viem';
import { deployAccount, fetchAccount } from 'zksync-sso/client';
import { SessionKeyModuleAbi } from "zksync-sso/abi";
import { createZksyncPasskeyClient, PasskeyRequiredContracts, registerNewPasskey, ZksyncSsoPasskeyClient } from 'zksync-sso/client/passkey';
import type { SessionConfig } from "zksync-sso/utils";
import { chain, contracts, authServerUrl } from './constants';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { eip712WalletActions } from "viem/zksync";

export interface SessionData {
  session: SessionConfig;
  sessionId: `0x${string}`;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: number;
}

const connector = zksyncSsoConnector({
  authServerUrl,
  session: {
    feeLimit: 0n,
    transfers: [{ to: "0x0000000000000000000000000000000000000000", valueLimit: 0n }]
  },
});

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [connector as CreateConnectorFn],
  transports: { [chain.id]: http() }
});

interface SSOState {
  // wagmiConfig: ReturnType<typeof createConfig> | null;
  account: ReturnType<typeof getAccount> | null;
  isConnected: boolean;
  address: string | undefined;
  passkeyClient: ZksyncSsoPasskeyClient<Transport, Chain> | null;
  sessions: SessionData[]

  sessionConfig: SessionConfig | null;

  // connectAccount: () => Promise<void>;
  // disconnectAccount: () => void;
  initialize: () => void;
  revokeSession: (sessionId: string) => Promise<void>;
  fetchAllSessions: () => Promise<void>;

  // --- passkey
  createAccountAndDeploy: () => Promise<void>;

  loginWithPasskey: () => Promise<void>;

  logout: () => Promise<void>;

  createSession: (session: SessionConfig) => Promise<void>;
}

export const useSSOStore = create<SSOState>((set, get) => ({
  account: null,
  isConnected: false,
  address: undefined,
  passkeyClient: null,
  sessions: [],
  sessionConfig: null,

  initialize: () => {
  },

  // connectAccount: async () => {
  //   let { wagmiConfig } = get();
    
  //   // Initialize if not already done
  //   if (!wagmiConfig) {
  //     const connector = zksyncSsoConnector({
  //       authServerUrl,
  //       session: {
  //         feeLimit: 0n,
  //         transfers: [{ to: "0x0000000000000000000000000000000000000000", valueLimit: 0n }]
  //       },
  //     });
  
  //     wagmiConfig = createConfig({
  //       chains: [chain],
  //       connectors: [connector as CreateConnectorFn],
  //       transports: { [chain.id]: http() }
  //     });
      
  //     set({ wagmiConfig });
  //   }

  //   const connector = zksyncSsoConnector({
  //     authServerUrl,
  //     session: {
  //       feeLimit: 0n,
  //       transfers: [{ to: "0x0000000000000000000000000000000000000000", valueLimit: 0n }]
  //     },
  //   });

  //   const result = await connect(wagmiConfig, {
  //     connector,
  //     chainId: chain.id,
  //   });
  //   console.log(result);
  //   const account = getAccount(wagmiConfig);
  //   set({
  //     account,
  //     isConnected: account.isConnected,
  //     address: account.address,
  //     shortAddress: account.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : null
  //   });
  // },

  // disconnectAccount: () => {
  //   const { wagmiConfig } = get();
  //   if (!wagmiConfig) return;
    
  //   disconnect(wagmiConfig);
  //   set({
  //     account: null,
  //     isConnected: false,
  //     address: undefined,
  //     shortAddress: null
  //   });
  // },

  createSession: async (session: SessionConfig) => {

    const passkeyClient = get().passkeyClient;

    if (!passkeyClient) {
      throw new Error('No passkey client found');
    }

    const result = await passkeyClient.createSession({
      sessionConfig: session,
      paymaster: {
        address: contracts.accountPaymaster as Address,
      },
    });
    
    console.log("create session success: ", result);

    set({
      sessionConfig: session,
    });

    get().fetchAllSessions();
  },

  revokeSession: async (sessionId: string) => {

    const client = createPublicClient({
      chain,
      transport: http()
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { username, address, passkeyPublicKey } = await fetchAccount(client as any, {
      contracts: {
        accountFactory: contracts.accountFactory as Address,
        passkey: contracts.passkey as Address,
        session: contracts.session as Address,
      }
    })

    const passkeyClient = createZksyncPasskeyClient({
      address: address,
      credentialPublicKey: passkeyPublicKey,
      userName: username,
      userDisplayName: username,
      contracts: contracts as PasskeyRequiredContracts,
      chain: chain,
      transport: http(),
    });

    const result = await passkeyClient.revokeSession({
      sessionId: sessionId as `0x${string}`,
    });

    console.log(result);

    get().fetchAllSessions();
  },

  fetchAllSessions: async () => {

    const client = createPublicClient({
      chain, 
      transport: http()
    });

    const address = get().address;

    const logs = await client.getContractEvents({
      abi: SessionKeyModuleAbi,
      address: contracts.session as Address,
      eventName: "SessionCreated",
      args: {
        account: address as `0x${string}`,
      },
      fromBlock: 0n,
    });

    const data = logs
    .filter((log) => log.args.sessionSpec && log.args.sessionHash)
    .map((log) => ({
      session: log.args.sessionSpec! as SessionConfig,
      sessionId: log.args.sessionHash!,
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      timestamp: new Date(parseInt((log as any).blockTimestamp as Hex, 16) * 1000).getTime(),
    })).sort((a, b) => {
      if (a.blockNumber < b.blockNumber) return 1;
      if (a.blockNumber > b.blockNumber) return -1;
      return 0;
    });

    set({
      sessions: data,
    });
  },
  
  loginWithPasskey: async () => {

    const client = createPublicClient({
      chain,
      transport: http()
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { address, passkeyPublicKey } = await fetchAccount(client as any, {
      contracts: {
        accountFactory: contracts.accountFactory as Address,
        passkey: contracts.passkey as Address,
        session: contracts.session as Address,
      }
    })
    
    const passkeyClient = createZksyncPasskeyClient({
      address: address,
      credentialPublicKey: passkeyPublicKey,
      userName: "chatbot",
      userDisplayName: "Chatbot",
      contracts: contracts as PasskeyRequiredContracts,
      chain,
      transport: http(),
    });

    set({
      passkeyClient: passkeyClient as ZksyncSsoPasskeyClient<Transport, Chain>,
      address: address,
      isConnected: true,
    });

    console.log(passkeyClient); 
  },


  createAccountAndDeploy: async () => {

    let name = `Chatbot ${(new Date()).toLocaleDateString("en-US")}`;
    name += ` ${(new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

    const { credentialPublicKey, credentialId } = await registerNewPasskey({
      userDisplayName: name, // Display name of the user
      userName: name, // Unique username
    });

    localStorage.setItem("chatbot.credentialPublicKey", toHex(credentialPublicKey));
    localStorage.setItem("chatbot.credentialId", credentialId);

    const throwAwayClient = createWalletClient({
      account: privateKeyToAccount(generatePrivateKey()),
      chain,
      transport: http(),
    })
      .extend(publicActions)
      .extend(walletActions)
      .extend(eip712WalletActions());
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { address } = await deployAccount(throwAwayClient as any, {
      contracts: {
        accountFactory: contracts.accountFactory as Address,
        passkey: contracts.passkey as Address,
        session: contracts.session as Address,
      },
      credentialPublicKey,
      uniqueAccountId: credentialId,
      paymasterAddress: contracts.accountPaymaster as Address,
      initialSession: undefined,
    })

    set({
      address: address,
    });
  },

  logout: async () => {
    set({
      passkeyClient: null,
      address: undefined,
      isConnected: false,
    });
  }
})); 