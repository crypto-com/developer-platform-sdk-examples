/**
 * SSO Wallet Transaction Agent
 * Sends 1 wei to a specified address every minute using a session key
 */

import { http, Address, createPublicClient, parseAbi, Hash } from 'viem'
import { createZksyncSessionClient } from 'zksync-sso/client'
import { SessionKeyModuleAbi } from 'zksync-sso/abi'
import {
  SessionConfig,
  LimitType,
  Limit,
  ConstraintCondition,
  Constraint,
  CallPolicy,
  TransferPolicy,
} from 'zksync-sso/utils'
import { config } from 'dotenv'

// Load environment variables
config()

// Constants from the codebase
const CHAIN = {
  id: 240,
  name: 'Cronos zkEVM Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Cronos zkEVM Test Coin',
    symbol: 'zkTCRO',
  },
  rpcUrls: {
    default: { http: ['https://seed.testnet.zkevm.cronos.org/'] },
  },
}

const CONTRACTS = {
  session: '0xfebC82bBFC6FB8666AC45fa8a601DfA34Ce30710' as `0x${string}`,
  passkey: '0x0A019BD60E42b9d18413C710992B96E69dFFC5A0' as `0x${string}`,
  accountFactory: '0x381539B4FC39eAe0Eb848f52cCA93F168a0e955D' as `0x${string}`,
  accountPaymaster: '0xA7B450E91Bc126aa93C656750f9c940bfdc2f1e9' as `0x${string}`,
}

// Required environment variables
const SESSION_KEY = process.env.SSO_WALLET_SESSION_KEY
const WALLET_ADDRESS = process.env.SSO_WALLET_ADDRESS
const TARGET_ADDRESS = process.env.TARGET_ADDRESS
const SESSION_PUBKEY = process.env.SSO_WALLET_SESSION_PUBKEY
const SEND_INTERVAL_SECONDS = process.env.SEND_INTERVAL_SECONDS
  ? parseInt(process.env.SEND_INTERVAL_SECONDS)
  : 60

// Validate environment variables
if (!SESSION_KEY) {
  throw new Error('SSO_WALLET_SESSION_KEY environment variable is required')
}
if (!WALLET_ADDRESS) {
  throw new Error('SSO_WALLET_ADDRESS environment variable is required')
}
if (!TARGET_ADDRESS) {
  throw new Error('TARGET_ADDRESS environment variable is required')
}

// Create a public client
const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(),
})

// Define a type for the event log with args
type SessionCreatedLog = {
  args: {
    account: Address
    sessionSpec: SessionConfig
    sessionHash?: Hash
  }
  transactionHash: Hash
  blockNumber: bigint
}

// Function to fetch session config
async function fetchSessionConfig(
  address: Address,
  signerPubKey?: Address
): Promise<SessionConfig | null> {
  try {
    // Format address for query (keep checksummed version for logs)
    const displayAddress = address

    console.log(`Querying for sessions with wallet address: ${displayAddress}`)

    // Get both created and revoked session events
    let createdLogs: any[] = []
    let revokedLogs: any[] = []

    try {
      console.log('Attempting to fetch sessions with account filter...')
      ;[createdLogs, revokedLogs] = await Promise.all([
        publicClient.getContractEvents({
          address: CONTRACTS.session,
          abi: SessionKeyModuleAbi,
          eventName: 'SessionCreated',
          args: {
            account: address, // Use address as-is, the client will handle formatting
          },
          fromBlock: 0n,
        }),
        publicClient.getContractEvents({
          address: CONTRACTS.session,
          abi: SessionKeyModuleAbi,
          eventName: 'SessionRevoked',
          args: {
            account: address, // Use address as-is, the client will handle formatting
          },
          fromBlock: 0n,
        }),
      ])

      console.log(`Found ${createdLogs.length} total sessions created for wallet ${displayAddress}`)
      console.log(`Found ${revokedLogs.length} total sessions revoked for wallet ${displayAddress}`)
    } catch (error) {
      console.error('Error fetching sessions with account filter:', error)
      createdLogs = []
      revokedLogs = []
    }

    // If no created sessions were found, try searching without args as a fallback
    if (createdLogs.length === 0) {
      console.log('No sessions found with args filter, trying without filtering by account...')
      try {
        // Try fetching a limited number of recent blocks first to reduce load
        // If RPC has issues with scanning too many blocks
        const currentBlock = await publicClient.getBlockNumber()
        const scanFromBlock = currentBlock > 1000n ? currentBlock - 1000n : 0n

        console.log(`Trying recent blocks first: scanning from ${scanFromBlock} to ${currentBlock}`)

        const allCreatedLogs = await publicClient.getContractEvents({
          address: CONTRACTS.session,
          abi: SessionKeyModuleAbi,
          eventName: 'SessionCreated',
          fromBlock: scanFromBlock,
          toBlock: currentBlock,
        })

        console.log(
          `Found ${allCreatedLogs.length} total SessionCreated events without account filtering (recent blocks)`
        )

        // If no recent events, try scanning all blocks in smaller chunks
        if (allCreatedLogs.length === 0 && scanFromBlock > 0n) {
          console.log('No recent events found, trying older blocks...')

          // Scan in chunks to avoid timeout
          const chunkSize = 10000n
          let fromBlock = 0n
          let toBlock = chunkSize

          while (fromBlock < scanFromBlock && createdLogs.length === 0) {
            if (toBlock > scanFromBlock) toBlock = scanFromBlock

            console.log(`Scanning block range ${fromBlock} to ${toBlock}...`)

            try {
              const chunkLogs = await publicClient.getContractEvents({
                address: CONTRACTS.session,
                abi: SessionKeyModuleAbi,
                eventName: 'SessionCreated',
                fromBlock: fromBlock,
                toBlock: toBlock,
              })

              console.log(`Found ${chunkLogs.length} events in block range ${fromBlock}-${toBlock}`)

              if (chunkLogs.length > 0) {
                allCreatedLogs.push(...chunkLogs)
              }
            } catch (error) {
              console.error(`Error scanning blocks ${fromBlock}-${toBlock}:`, error)
            }

            fromBlock = toBlock + 1n
            toBlock = fromBlock + chunkSize
          }
        }

        // Manually filter for our address
        console.log(`Total unfiltered events found: ${allCreatedLogs.length}`)
        const filteredLogs = allCreatedLogs.filter(log => {
          const eventAccount = (log.args as any).account
          if (eventAccount) {
            console.log(`Event account: ${eventAccount}, Our address: ${displayAddress}`)
            return eventAccount.toLowerCase() === displayAddress.toLowerCase()
          }
          return false
        })

        if (filteredLogs.length > 0) {
          console.log(`Manually filtered ${filteredLogs.length} sessions for our address`)
          // If we found logs, use them instead
          createdLogs.push(...filteredLogs)
        } else {
          console.log('No sessions found after manual filtering')

          // Log some event details for debugging
          if (allCreatedLogs.length > 0) {
            console.log('Sample of found events:')
            allCreatedLogs.slice(0, Math.min(5, allCreatedLogs.length)).forEach((log, i) => {
              console.log(
                `Event ${i + 1}:`,
                JSON.stringify(
                  {
                    blockNumber: log.blockNumber?.toString(),
                    args: log.args as any,
                    transactionHash: log.transactionHash,
                  },
                  null,
                  2
                )
              )
            })
          }
        }
      } catch (error) {
        console.error('Error in fallback search:', error)
      }
    }

    // Check if we found any logs
    if (createdLogs.length === 0) {
      console.log('No sessions found after all search attempts.')

      // One last attempt: try getting all events and manually filtering
      try {
        // Check RPC capabilities
        console.log('Verifying RPC status...')
        const blockNumber = await publicClient.getBlockNumber()
        console.log(`RPC responding with current block: ${blockNumber}`)

        console.log('Trying direct contract read...')
        // Try getting session using different approach if available
        // This depends on the contract having a proper getter, which may not exist
        // Add any alternative methods to retrieve sessions here
      } catch (error) {
        console.error('Error in verification stage:', error)
      }

      return null
    }

    // Get the session hashes that have been revoked
    const revokedSessionHashes = new Set(revokedLogs.map(log => (log.args as any).sessionHash))

    // Current timestamp for checking expiration
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
    console.log(`Current timestamp: ${currentTimestamp}`)

    // Filter out expired and revoked sessions
    const activeSessions = createdLogs
      .filter(log => {
        const sessionSpec = log.args.sessionSpec
        console.log(
          `Checking session: ${JSON.stringify({
            signer: sessionSpec?.signer,
            expiresAt: sessionSpec?.expiresAt?.toString(),
            account: log?.args?.account,
          })}`
        )

        const isNotExpired = sessionSpec && BigInt(sessionSpec.expiresAt) > currentTimestamp
        const isNotRevoked =
          !log?.args?.sessionHash || !revokedSessionHashes.has(log.args.sessionHash)

        if (!isNotExpired) {
          console.log(
            `Skipping expired session: ${sessionSpec?.signer}, expires: ${sessionSpec?.expiresAt}`
          )
        }

        if (!isNotRevoked) {
          console.log(`Skipping revoked session: ${sessionSpec?.signer}`)
        }

        return isNotExpired && isNotRevoked
      })
      // Sort by block number (most recent first)
      .sort((a, b) => {
        const blockNumA = a.blockNumber || 0n
        const blockNumB = b.blockNumber || 0n
        return blockNumA < blockNumB ? 1 : -1
      })

    console.log(`Found ${activeSessions.length} active sessions for wallet ${displayAddress}`)

    // Filter by signer public key if provided
    let filteredSessions = activeSessions
    if (signerPubKey && activeSessions.length > 0) {
      const beforeCount = activeSessions.length
      filteredSessions = activeSessions.filter(log => {
        const sessionSigner = log.args.sessionSpec.signer
        console.log(
          `Comparing session signer ${sessionSigner} with requested signer ${signerPubKey}`
        )
        return sessionSigner.toLowerCase() === signerPubKey.toLowerCase()
      })
      console.log(
        `Filtered for session with public key ${signerPubKey}: ${filteredSessions.length}/${beforeCount} sessions match`
      )
    }

    // Log session data for debugging
    if (filteredSessions.length > 0) {
      console.log(
        'Active session details:',
        filteredSessions.map(log => ({
          signer: log.args.sessionSpec.signer,
          expiresAt: log.args.sessionSpec.expiresAt.toString(),
          sessionId: log.args.sessionHash,
        }))
      )
    }

    // Return the most recent session config or null if none found
    return filteredSessions.length > 0 ? filteredSessions[0].args.sessionSpec : null
  } catch (error) {
    console.error('Failed to fetch session config:', error)
    return null
  }
}

// Function to send transaction
async function sendTransaction(
  sessionConfig: SessionConfig,
  amount: bigint | number | string = 1n, // Make amount more flexible
  data?: `0x${string}` // Add data parameter
): Promise<string | null> {
  try {
    // Log transaction details for debugging
    console.log('Sending transaction with:')
    console.log(`- Target: ${TARGET_ADDRESS}`)
    console.log(`- Amount: ${amount} wei`)
    console.log(`- Data: ${data || 'none'}`)
    console.log('- Session Config Details:')
    console.log(`  - Signer: ${sessionConfig.signer}`)
    console.log(`  - ExpiresAt: ${sessionConfig.expiresAt.toString()}`)
    console.log(`  - CallPolicies: ${sessionConfig.callPolicies?.length || 0}`)
    console.log(`  - TransferPolicies: ${sessionConfig.transferPolicies?.length || 0}`)

    if (sessionConfig.feeLimit) {
      console.log(`  - FeeLimit Type: ${LimitType[sessionConfig.feeLimit.limitType]}`)
      console.log(`  - FeeLimit: ${sessionConfig.feeLimit.limit.toString()}`)
      console.log(`  - FeeLimit Period: ${sessionConfig.feeLimit.period.toString()}`)
    }

    // Log transfer policies for debugging
    if (sessionConfig.transferPolicies && sessionConfig.transferPolicies.length > 0) {
      sessionConfig.transferPolicies.forEach((policy, index) => {
        console.log(`  - TransferPolicy ${index + 1}:`)
        console.log(`    - Target: ${policy.target}`)
        console.log(`    - MaxValuePerUse: ${policy.maxValuePerUse.toString()}`)
        if (policy.valueLimit) {
          console.log(`    - ValueLimit Type: ${LimitType[policy.valueLimit.limitType]}`)
        }
      })
    }

    // Create session client using the session key
    const sessionClient = createZksyncSessionClient({
      chain: CHAIN,
      transport: http(),
      sessionKey: SESSION_KEY as `0x${string}`,
      contracts: CONTRACTS,
      address: WALLET_ADDRESS as `0x${string}`,
      sessionConfig, // Use the exact session config from the blockchain
    })

    // Ensure amount is a valid BigInt
    let valueToSend: bigint

    try {
      // Handle different input types safely
      if (typeof amount === 'bigint') {
        valueToSend = amount
      } else if (typeof amount === 'number') {
        valueToSend = BigInt(amount)
      } else if (typeof amount === 'string') {
        valueToSend = BigInt(amount)
      } else {
        // If amount is an object or other non-primitive type
        console.warn('Amount is not a primitive type, using default value')
        valueToSend = 1n
      }
    } catch (error) {
      console.warn(`Could not convert amount to BigInt, using default: ${error}`)
      valueToSend = 1n
    }

    console.log(`Converted amount to BigInt: ${valueToSend}`)

    // Creating a properly formatted transaction object
    const txParams = {
      to: TARGET_ADDRESS as `0x${string}`,
      value: valueToSend,
      ...(data ? { data } : {}),
    }

    console.log('--------------------------------')
    console.log('Transaction parameters:')
    console.log(`- to: ${txParams.to}`)
    console.log(`- value: ${txParams.value.toString()}`)
    if (data) {
      console.log(`- data: ${data}`)
    }

    // Add more specific debug information
    console.log('About to send transaction with final parameters:')
    console.log(
      JSON.stringify({
        to: txParams.to,
        value: txParams.value.toString(),
        data: data || 'undefined',
      })
    )

    // Send the transaction with properly formatted parameters
    const tx = await sessionClient.sendTransaction(txParams)
    console.log(`Transaction sent: ${tx}`)
    return tx
  } catch (error) {
    console.error('Failed to send transaction:', error)

    // Better error diagnosis
    if (error instanceof Error) {
      if (error.message.includes('does not fit any policy')) {
        console.error(
          'POLICY ERROR: The transaction does not match any of the policies in your session.'
        )
        console.error('This usually happens when:')
        console.error('1. The target address does not match any transfer policy targets.')
        console.error('2. The transaction amount exceeds policy limits.')
        console.error('3. The transaction type is not allowed by session policies.')
        console.error('')
        console.error('Ensure your session was created with the right permissions for:')
        console.error(`- Target address: ${TARGET_ADDRESS}`)
        console.error('- ETH transfers (if sending ETH)')
        console.error('- Contract calls (if calling a contract)')
      } else if (error.message.includes('Session is not active')) {
        console.error('SESSION ERROR: The session is not active on the blockchain.')
        console.error('This usually happens when:')
        console.error('1. The session has been revoked.')
        console.error('2. The session has expired.')
        console.error('3. The session was created with different parameters than what we have.')
        console.error('')
        console.error('Try creating a new session with the correct permissions.')
      }
    }

    return null
  }
}

// Main function to start the agent
async function startAgent() {
  console.log('Starting SSO Wallet Transaction Agent...')
  console.log(`Wallet address: ${WALLET_ADDRESS}`)
  console.log(`Target address: ${TARGET_ADDRESS}`)
  console.log(`Session contract address: ${CONTRACTS.session}`)
  console.log(`Chain ID: ${CHAIN.id}`)
  console.log(`Transaction interval: ${SEND_INTERVAL_SECONDS} seconds`)

  // Check if we're looking for a specific session by public key
  if (SESSION_PUBKEY) {
    console.log(`Looking for session with public key: ${SESSION_PUBKEY}`)
  }

  try {
    // Check if RPC is working by getting current block
    const blockNumber = await publicClient.getBlockNumber()
    console.log(`Connected to RPC. Current block number: ${blockNumber}`)

    // First, fetch ALL session configs for the wallet address without filtering by session public key
    console.log('Fetching all sessions for wallet address (without public key filter)...')

    // Get all active sessions
    const allActiveSessions = await publicClient.getContractEvents({
      address: CONTRACTS.session,
      abi: SessionKeyModuleAbi,
      eventName: 'SessionCreated',
      args: {
        account: WALLET_ADDRESS as `0x${string}`,
      },
      fromBlock: 0n,
    })

    // Get all revoked sessions
    const revokedLogs = await publicClient.getContractEvents({
      address: CONTRACTS.session,
      abi: SessionKeyModuleAbi,
      eventName: 'SessionRevoked',
      args: {
        account: WALLET_ADDRESS as `0x${string}`,
      },
      fromBlock: 0n,
    })

    // Get the session hashes that have been revoked
    const revokedSessionHashes = new Set(revokedLogs.map(log => (log.args as any).sessionHash))

    // Current timestamp for checking expiration
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))

    // Filter out expired and revoked sessions
    const activeSessions = allActiveSessions.filter(log => {
      const sessionSpec = (log.args as any).sessionSpec
      const isNotExpired = sessionSpec && BigInt(sessionSpec.expiresAt) > currentTimestamp
      const isNotRevoked =
        !(log.args as any).sessionHash || !revokedSessionHashes.has((log.args as any).sessionHash)
      return isNotExpired && isNotRevoked
    })

    if (activeSessions.length === 0) {
      console.error('\n========================================')
      console.error('ERROR: No active sessions found for wallet address!')
      console.error('========================================')
      console.error('To fix this issue:')
      console.error('1. Run the main web application (the React app)')
      console.error('2. Log in to your wallet with address:', WALLET_ADDRESS)
      console.error('3. Create a new session with the following public key:', SESSION_PUBKEY)
      console.error('4. Set an appropriate expiration time and limits')
      console.error('5. After creating the session, run this agent again')
      console.error('========================================')
      throw new Error(
        `No active sessions found for wallet address ${WALLET_ADDRESS}. Please create a session first.`
      )
    }

    // Log all active sessions for debugging
    console.log(
      'Active session details:',
      activeSessions.map(log => ({
        signer: (log.args as any).sessionSpec.signer,
        expiresAt: (log.args as any).sessionSpec.expiresAt.toString(),
        sessionId: (log.args as any).sessionHash,
      }))
    )

    // If we have a specific session public key to use, filter for it
    let sessionConfig = (activeSessions[0].args as any).sessionSpec
    if (SESSION_PUBKEY) {
      console.log(`Now filtering for specific session with public key: ${SESSION_PUBKEY}`)

      // Find the matching session from the active sessions list
      const matchingSession = activeSessions.find(
        log =>
          ((log.args as any).sessionSpec.signer as string).toLowerCase() ===
          SESSION_PUBKEY.toLowerCase()
      )

      if (!matchingSession) {
        throw new Error(
          `No active session found with public key ${SESSION_PUBKEY} for wallet address ${WALLET_ADDRESS}. Check if the session has been created and has not expired.`
        )
      }

      sessionConfig = (matchingSession.args as any).sessionSpec
      console.log(`Found matching session with public key ${SESSION_PUBKEY}`)
    }

    console.log(`Session config found, using session with public key: ${sessionConfig.signer}`)
    console.log(
      `Session expires at: ${new Date(Number(sessionConfig.expiresAt) * 1000).toLocaleString()}`
    )
    console.log('Starting transaction schedule')

    // Schedule transactions using the configured interval
    setInterval(async () => {
      const timestamp = new Date().toLocaleString()
      console.log(`[${timestamp}] Sending 1 wei transaction...`)

      const txHash = await sendTransaction(sessionConfig, 1n, undefined)
      if (txHash) {
        console.log(`[${timestamp}] Transaction sent successfully: ${txHash}`)
      } else {
        console.error(`[${timestamp}] Failed to send transaction`)
      }
    }, SEND_INTERVAL_SECONDS * 1000) // Convert seconds to milliseconds

    // Send an initial transaction
    await sendTransaction(sessionConfig, 1n, undefined)
  } catch (error) {
    console.error('Failed to start agent:', error)
    throw error
  }
}

// Start the agent
startAgent().catch(error => {
  console.error('Agent error:', error)
  process.exit(1)
})
