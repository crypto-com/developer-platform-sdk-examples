import { create } from 'zustand'
import { getAccount, http } from "@wagmi/core";
import { Address, createPublicClient, createWalletClient, Hex, publicActions, walletActions, toHex, Chain, Transport, Hash } from 'viem';
import { deployAccount, fetchAccount } from 'zksync-sso/client';
import { SessionKeyModuleAbi } from "zksync-sso/abi";
import { createZksyncPasskeyClient, registerNewPasskey, ZksyncSsoPasskeyClient } from 'zksync-sso/client/passkey';
import type { SessionConfig, SessionState } from "zksync-sso/utils";
import { CHAIN, CONTRACTS } from './constants';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { eip712WalletActions } from "viem/zksync";

export interface SessionData {
  session: SessionConfig;
  sessionId: Hash;
  transactionHash: Hash;
  blockNumber: bigint;
  timestamp: number;
}

interface SSOState {
  account: ReturnType<typeof getAccount> | null;
  isConnected: boolean;
  address: Address | undefined;
  passkeyClient: ZksyncSsoPasskeyClient<Transport, Chain> | null;
  sessions: SessionData[]

  sessionConfig: SessionConfig | null;

  initialize: () => void;
  revokeSession: (sessionId: Hash) => Promise<void>;
  fetchAllSessions: () => Promise<void>;

  fetchSessionState: (sessionData: SessionData) => Promise<SessionState>;

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

  initialize: () => { },

  createSession: async (session: SessionConfig) => {

    const passkeyClient = get().passkeyClient;

    if (!passkeyClient) {
      throw new Error('No passkey client found');
    }

    const result = await passkeyClient.createSession({
      sessionConfig: session,
      paymaster: {
        address: CONTRACTS.accountPaymaster,
      },
    });

    console.log("create session success: ", result);

    set({
      sessionConfig: session,
    });

    get().fetchAllSessions();
  },

  revokeSession: async (sessionId: Hash) => {
    const passkeyClient = get().passkeyClient;

    if (!passkeyClient) {
      throw new Error('No passkey client found');
    }


    try {
      const result = await passkeyClient.revokeSession({
        sessionId,
        paymaster: {
          address: CONTRACTS.accountPaymaster,
        },
      });

      console.log("revoke session success: ", result);

      get().fetchAllSessions();
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  },

  fetchAllSessions: async () => {

    const client = createPublicClient({
      chain: CHAIN,
      transport: http()
    });

    const address = get().address;

    const logs = await client.getContractEvents({
      abi: SessionKeyModuleAbi,
      address: CONTRACTS.session,
      eventName: "SessionCreated",
      args: {
        account: address,
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
      chain: CHAIN,
      transport: http()
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { address, passkeyPublicKey } = await fetchAccount(client as any, {
      contracts: CONTRACTS
    })

    console.log("fetch account success: ", address, toHex(passkeyPublicKey));

    const passkeyClient = createZksyncPasskeyClient({
      address,
      credentialPublicKey: passkeyPublicKey,
      userName: "chatbot",
      userDisplayName: "Chatbot",
      contracts: CONTRACTS,
      chain: CHAIN,
      transport: http(),
    });

    set({
      passkeyClient: passkeyClient as ZksyncSsoPasskeyClient<Transport, Chain>,
      address: address,
      isConnected: true,
    });
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
      chain: CHAIN,
      transport: http(),
    })
      .extend(publicActions)
      .extend(walletActions)
      .extend(eip712WalletActions());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { address } = await deployAccount(throwAwayClient as any, {
      contracts: CONTRACTS,
      credentialPublicKey,
      uniqueAccountId: credentialId,
      paymasterAddress: CONTRACTS.accountPaymaster,
      initialSession: undefined,
    })

    const passkeyClient = createZksyncPasskeyClient({
      address,
      credentialPublicKey: credentialPublicKey,
      userName: "chatbot",
      userDisplayName: "Chatbot",
      contracts: CONTRACTS,
      chain: CHAIN,
      transport: http(),
    });


    set({
      address: address,
      isConnected: true,
      passkeyClient: passkeyClient as ZksyncSsoPasskeyClient<Transport, Chain>,
    });
  },

  logout: async () => {
    set({
      passkeyClient: null,
      address: undefined,
      isConnected: false,
    });
  },

  fetchSessionState: async (sessionData: SessionData) => {
    const passkeyClient = get().passkeyClient;
    const address = get().address;

    if (!passkeyClient || !address) {
      throw new Error('No passkey client found');
    }

    const client = createPublicClient({
      chain: CHAIN,
      transport: http()
    });

    const state = await client.readContract({
      address: CONTRACTS.session,
      abi: SessionKeyModuleAbi,
      functionName: "sessionState",
      args: [address, sessionData.session],
    }) as SessionState;

    return state;
  }
})); 