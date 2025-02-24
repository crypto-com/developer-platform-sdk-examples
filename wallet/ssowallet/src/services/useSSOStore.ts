import { create } from 'zustand'
import {
  createPublicClient,
  createWalletClient,
  Address,
  Transport,
  Chain,
  Hash,
  publicActions,
  walletActions,
  http,
  toHex,
} from 'viem'
import { deployAccount, fetchAccount } from 'zksync-sso/client'
import {
  createZksyncPasskeyClient,
  registerNewPasskey,
  ZksyncSsoPasskeyClient,
} from 'zksync-sso/client/passkey'
import { createZksyncSessionClient } from 'zksync-sso/client'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { eip712WalletActions } from 'viem/zksync'
import { CHAIN, CONTRACTS } from './constants'
import { SessionKeyModuleAbi } from 'zksync-sso/abi'
import type { SessionConfig } from 'zksync-sso/utils'
import { startAuthentication } from '@simplewebauthn/browser'

export interface SessionData {
  session: SessionConfig
  sessionId: Hash
  transactionHash: Hash
  blockNumber: bigint
  timestamp: number
}

interface SSOState {
  isConnected: boolean
  address: Address | undefined
  passkeyClient: ZksyncSsoPasskeyClient<Transport, Chain> | null
  sessions: SessionData[]
  sessionConfig: SessionConfig | null

  createAccountAndDeploy: () => Promise<void>
  loginWithPasskey: () => Promise<void>
  logout: () => Promise<void>
  createSession: (session: SessionConfig) => Promise<void>
  revokeSession: (sessionId: Hash) => Promise<void>
  fetchAllSessions: () => Promise<void>
  sendTransaction: (
    to: Address,
    amount: bigint,
    data?: `0x${string}`
  ) => Promise<Hash>
  getBalance: () => Promise<string>
  setSessionConfig: (session: SessionConfig | null) => void
}

export const useSSOStore = create<SSOState>((set, get) => ({
  isConnected: false,
  address: undefined,
  passkeyClient: null,
  sessions: [],
  sessionConfig: null,

  createAccountAndDeploy: async () => {
    let name = `Chatbot ${new Date().toLocaleDateString('en-US')}`
    name += ` ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

    const { credentialPublicKey, credentialId } = await registerNewPasskey({
      userDisplayName: name, // Display name of the user
      userName: name, // Unique username
    })

    localStorage.setItem('sso.credentialPublicKey', toHex(credentialPublicKey))
    localStorage.setItem('sso.credentialId', credentialId)

    const throwAwayClient = createWalletClient({
      account: privateKeyToAccount(generatePrivateKey()),
      chain: CHAIN,
      transport: http(),
    })
      .extend(publicActions)
      .extend(walletActions)
      .extend(eip712WalletActions())

    const deployResult = await deployAccount(throwAwayClient as any, {
      contracts: CONTRACTS,
      credentialPublicKey,
      uniqueAccountId: credentialId,
      paymasterAddress: CONTRACTS.accountPaymaster,
      initialSession: undefined,
    })
    const { address } = deployResult

    const passkeyClient = createZksyncPasskeyClient({
      address,
      credentialPublicKey: credentialPublicKey,
      userName: 'chatbot',
      userDisplayName: 'Chatbot',
      contracts: CONTRACTS,
      chain: CHAIN,
      transport: http(),
    })

    set({
      address: address,
      isConnected: true,
      passkeyClient: passkeyClient as ZksyncSsoPasskeyClient<Transport, Chain>,
    })
  },

  loginWithPasskey: async () => {
    const client = createPublicClient({
      chain: CHAIN,
      transport: http(),
    })

    try {
      let credentialId = localStorage.getItem('sso.credentialId')
      const isLoggedIn = localStorage.getItem('sso.logined') === 'true'

      // Only ask for passkey authentication if not logged in
      if (!isLoggedIn) {
        const authResult = await startAuthentication({
          // for base64url encoding
          challenge: btoa(
            String.fromCharCode.apply(
              null,
              Array.from(crypto.getRandomValues(new Uint8Array(32)))
            )
          )
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, ''),
          allowCredentials: [],
          rpId: window.location.hostname,
          userVerification: 'required',
        })
        credentialId = authResult.id
      }

      if (!credentialId) {
        throw new Error('No credential ID found')
      }

      const { address, passkeyPublicKey } = await fetchAccount(client as any, {
        contracts: CONTRACTS,
        uniqueAccountId: credentialId,
      })

      // Store credentials
      localStorage.setItem('sso.credentialPublicKey', toHex(passkeyPublicKey))
      localStorage.setItem('sso.credentialId', credentialId)
      localStorage.setItem(
        'wagmi.wallet',
        JSON.stringify({
          name: 'SSO Wallet',
          account: address,
          chain: CHAIN.id,
          transport: 'http',
        })
      )

      // Create passkey client with additional metadata
      const passkeyClient = createZksyncPasskeyClient({
        address,
        credentialPublicKey: passkeyPublicKey,
        userName: 'SSO Wallet',
        userDisplayName: 'SSO Wallet',
        contracts: CONTRACTS,
        chain: CHAIN,
        transport: http(),
      })

      // Update store state
      set({
        passkeyClient: passkeyClient as ZksyncSsoPasskeyClient<
          Transport,
          Chain
        >,
        address,
        isConnected: true,
      })

      // Store login state
      localStorage.setItem('sso.logined', 'true')

      // Initialize sessions and restore active session if available
      const { fetchAllSessions, setSessionConfig } = get()
      await fetchAllSessions()

      // Try to restore active session
      const sessionKey = localStorage.getItem('sso.sessionKey')
      if (sessionKey && !localStorage.getItem('sso.sessionDeselected')) {
        const { sessions } = get()
        const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
        const activeSession = sessions.find(
          (s) => BigInt(s.session.expiresAt) > currentTimestamp
        )
        if (activeSession) {
          setSessionConfig(activeSession.session)
        }
      }
    } catch (error) {
      // Only clear stored state if it's an authentication error or account not found
      if (
        error instanceof Error &&
        (error.message.includes('authentication') ||
          error.message.includes('account not found') ||
          error.message.includes('Invalid credential'))
      ) {
        localStorage.setItem('sso.logined', 'false')
        localStorage.removeItem('sso.credentialId')
        localStorage.removeItem('sso.credentialPublicKey')
        localStorage.removeItem('sso.sessionKey')
        localStorage.removeItem('sso.sessionDeselected')
        localStorage.removeItem('wagmi.wallet')
      }

      set({
        passkeyClient: null,
        address: undefined,
        isConnected: false,
        sessions: [],
        sessionConfig: null,
      })
      throw error
    }
  },

  logout: async () => {
    // Clear all stored credentials and login state
    localStorage.setItem('sso.logined', 'false')
    localStorage.removeItem('sso.credentialId')
    localStorage.removeItem('sso.credentialPublicKey')
    localStorage.removeItem('sso.sessionKey')
    localStorage.removeItem('sso.sessionDeselected')
    localStorage.removeItem('wagmi.wallet')

    set({
      passkeyClient: null,
      address: undefined,
      isConnected: false,
      sessions: [],
      sessionConfig: null,
    })
  },

  createSession: async (session: SessionConfig) => {
    const { passkeyClient, address } = get()
    if (!passkeyClient) throw new Error('No passkey client found')
    if (!address) throw new Error('No account address found')

    try {
      // Verify we have the necessary credential information
      const credentialId = localStorage.getItem('sso.credentialId')
      const credentialPublicKeyHex = localStorage.getItem(
        'sso.credentialPublicKey'
      )

      if (!credentialId || !credentialPublicKeyHex) {
        throw new Error(
          'Missing credential information. Please try logging in again.'
        )
      }

      await passkeyClient.createSession({
        sessionConfig: session,
        paymaster: {
          address: CONTRACTS.accountPaymaster,
        },
      })

      // Update the local state
      set({ sessionConfig: session })

      // Refresh the sessions list
      await get().fetchAllSessions()
    } catch (error) {
      console.error('Failed to create session:', error)
      if (error instanceof Error) {
        throw new Error(`Failed to create session: ${error.message}`)
      }
      throw new Error('Failed to create session: An unexpected error occurred')
    }
  },

  revokeSession: async (sessionId: Hash) => {
    const { passkeyClient, sessions } = get()
    if (!passkeyClient) throw new Error('No passkey client found')

    // Find the session to be revoked
    const sessionToRevoke = sessions.find((s) => s.sessionId === sessionId)
    if (!sessionToRevoke) {
      throw new Error('Session not found')
    }

    try {
      await passkeyClient.revokeSession({
        sessionId,
        paymaster: {
          address: CONTRACTS.accountPaymaster,
        },
      })

      // Clear the session config if it was the active session
      const { sessionConfig } = get()
      if (
        sessionConfig &&
        sessionToRevoke.session.signer === sessionConfig.signer
      ) {
        set({ sessionConfig: null })
      }

      // Refresh sessions list
      await get().fetchAllSessions()
    } catch (error) {
      console.error('Failed to revoke session:', error)

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('counter')) {
          throw new Error(
            'Failed to revoke session: Session counter mismatch. The session may have already been revoked.'
          )
        } else if (error.message.includes('transaction reverted')) {
          throw new Error(
            'Failed to revoke session: Transaction was reverted by the network. Please try again.'
          )
        } else {
          throw new Error(`Failed to revoke session: ${error.message}`)
        }
      }
      throw new Error('Failed to revoke session: An unexpected error occurred')
    }
  },

  fetchAllSessions: async () => {
    const { address } = get()
    if (!address) return

    const client = createPublicClient({
      chain: CHAIN,
      transport: http(),
    })

    // Get both created and revoked session events
    const [createdLogs, revokedLogs] = await Promise.all([
      client.getContractEvents({
        abi: SessionKeyModuleAbi,
        address: CONTRACTS.session,
        eventName: 'SessionCreated',
        args: { account: address },
        fromBlock: 0n,
      }),
      client.getContractEvents({
        abi: SessionKeyModuleAbi,
        address: CONTRACTS.session,
        eventName: 'SessionRevoked',
        args: { account: address },
        fromBlock: 0n,
      }),
    ])

    // Get the session hashes that have been revoked
    const revokedSessionHashes = new Set(
      revokedLogs.map((log) => log.args.sessionHash)
    )

    // Filter out revoked sessions and map the data
    const data = createdLogs
      .filter(
        (log) =>
          log.args.sessionSpec &&
          log.args.sessionHash &&
          !revokedSessionHashes.has(log.args.sessionHash)
      )
      .map((log) => ({
        session: log.args.sessionSpec! as SessionConfig,
        sessionId: log.args.sessionHash!,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp: new Date(
          parseInt((log as any).blockTimestamp as Hash, 16) * 1000
        ).getTime(),
      }))
      .sort((a, b) => (a.blockNumber < b.blockNumber ? 1 : -1))

    set({ sessions: data })
  },

  sendTransaction: async (
    to: Address,
    amount: bigint,
    data?: `0x${string}`
  ) => {
    const { sessionConfig, passkeyClient, address } = get()
    const sessionKey = localStorage.getItem('sso.sessionKey')

    // If we have an active session and session key, use session-based transaction
    if (sessionConfig && sessionKey && address) {
      // Check if session is expired
      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
      if (currentTimestamp >= sessionConfig.expiresAt) {
        throw new Error('Session has expired. Please create a new session.')
      }

      // Check if the transaction is within session limits
      const targetPolicy = sessionConfig.transferPolicies.find(
        (policy) => policy.target.toLowerCase() === to.toLowerCase()
      )

      if (!targetPolicy) {
        throw new Error(
          'Transaction target not allowed in current session. Please create a new session for this recipient.'
        )
      }

      if (amount > targetPolicy.maxValuePerUse) {
        throw new Error(
          `Transaction amount exceeds session limit. Maximum allowed: ${targetPolicy.maxValuePerUse.toString()} Wei`
        )
      }

      if (amount > targetPolicy.valueLimit.limit) {
        throw new Error(
          `Transaction amount exceeds lifetime limit. Maximum allowed: ${targetPolicy.valueLimit.limit.toString()} Wei`
        )
      }

      // Create session client using the stored session key
      const sessionClient = createZksyncSessionClient({
        chain: CHAIN,
        transport: http(),
        sessionKey: sessionKey as `0x${string}`,
        contracts: CONTRACTS,
        address,
        sessionConfig,
      })

      try {
        const tx = await sessionClient.sendTransaction({
          to,
          value: amount,
          data,
        })
        return tx
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Lifetime limit exceeded')) {
            throw new Error(
              'Session lifetime limit exceeded. Please create a new session.'
            )
          } else if (
            error.message.includes('Session expired') ||
            error.message.includes('Invalid session')
          ) {
            throw new Error(
              'Session has expired or is invalid. Please create a new session.'
            )
          }
          throw error
        }
        throw error
      }
    }

    // Fallback to passkey if no session
    if (!passkeyClient)
      throw new Error('No passkey client found and no active session')

    const tx = await passkeyClient.sendTransaction({
      to,
      value: amount,
      data,
    })

    return tx
  },

  getBalance: async () => {
    const { address } = get()
    if (!address) throw new Error('No address found')

    const client = createPublicClient({
      chain: CHAIN,
      transport: http(),
    })

    const balance = await client.getBalance({ address })
    return balance.toString()
  },

  setSessionConfig: (session: SessionConfig | null) => {
    set({ sessionConfig: session })
  },
}))
