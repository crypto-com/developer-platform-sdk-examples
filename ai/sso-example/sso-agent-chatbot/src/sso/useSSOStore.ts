import { create } from 'zustand'
import { getAccount, http } from "@wagmi/core";
import { Address, createPublicClient, createWalletClient, Hex, publicActions, walletActions, toHex, Chain, Transport, Hash } from 'viem';
import { deployAccount, fetchAccount } from 'zksync-sso/client';
import { SessionKeyModuleAbi } from "zksync-sso/abi";
import { createZksyncPasskeyClient, PasskeyRequiredContracts, registerNewPasskey, ZksyncSsoPasskeyClient } from 'zksync-sso/client/passkey';
import type { SessionConfig } from "zksync-sso/utils";
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

    const client = createPublicClient({
      chain: CHAIN,
      transport: http()
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { username, address, passkeyPublicKey } = await fetchAccount(client as any, {
      contracts: {
        accountFactory: CONTRACTS.accountFactory as Address,
        passkey: CONTRACTS.passkey as Address,
        session: CONTRACTS.session as Address,
      }
    })

    const passkeyClient = createZksyncPasskeyClient({
      address: address,
      credentialPublicKey: passkeyPublicKey,
      userName: username,
      userDisplayName: username,
      contracts: CONTRACTS as PasskeyRequiredContracts,
      chain: CHAIN,
      transport: http(),
    });

    const result = await passkeyClient.revokeSession({
      sessionId,
    });

    console.log(result);

    get().fetchAllSessions();
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
    
    const passkeyClient = createZksyncPasskeyClient({
      address: address,
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