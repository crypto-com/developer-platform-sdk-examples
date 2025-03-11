import { useState, useEffect, useRef } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  Navigate,
} from 'react-router-dom'
import { useSSOStore } from './services/useSSOStore'
import {
  Button,
  Card,
  Divider,
  Form,
  Input,
  Layout,
  Menu,
  message,
  Modal,
  Popover,
  Spin,
  Typography,
  Space,
} from 'antd'
import {
  CopyOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { LimitType, SessionConfig } from 'zksync-sso/utils'
import { generatePrivateKey, privateKeyToAddress } from 'viem/accounts'
import './App.css'

const { Text, Title } = Typography

// Utility function for showing error messages
const showError = (err: unknown) => {
  let errorMessage = 'An error occurred'
  if (err instanceof Error) {
    const detailsMatch = err.message.match(/Details: (.+?)(?=\.|$|\n)/)
    errorMessage = detailsMatch ? detailsMatch[1] : err.message
  } else if (typeof err === 'string') {
    errorMessage = err
  }
  message.error({
    content: errorMessage,
    duration: 10,
    className: 'message-with-close',
    onClick: () => message.destroy(),
  })
  return errorMessage
}

function WalletSetup() {
  const { createAccountAndDeploy, loginWithPasskey, isConnected, address } =
    useSSOStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    try {
      setLoading(true)

      await createAccountAndDeploy()

      message.success('Wallet created successfully')
      navigate('/dashboard')
    } catch (err) {
      console.error('Wallet creation error:', err)
      showError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    try {
      setLoading(true)
      await loginWithPasskey()
      message.success('Logged in successfully')
      navigate('/dashboard')
    } catch (err) {
      showError(err)
    } finally {
      setLoading(false)
    }
  }

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      message.success('Address copied to clipboard')
    }
  }

  useEffect(() => {
    if (address) {
      const button = document.getElementById('copy-address-button')
      if (button) {
        button.onclick = copyAddress
      }
    }
  }, [address])

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow-lg rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
              Wallet Setup
            </h2>
            {isConnected ? (
              <div className="space-y-6">
                <div className="bg-primary-50 rounded-lg p-6">
                  <Text strong className="text-lg text-primary-800 block mb-4">
                    Your Wallet Address:
                  </Text>
                  <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-primary-200">
                    <Text
                      code
                      copyable
                      className="text-sm text-gray-600 flex-1"
                    >
                      {address}
                    </Text>
                    <Button
                      type="text"
                      icon={<CopyOutlined className="text-primary-600" />}
                      onClick={copyAddress}
                      title="Copy address"
                      className="ml-2"
                    />
                  </div>
                  <Text
                    type="secondary"
                    className="mt-4 text-sm text-primary-700 block"
                  >
                    This is your unique wallet address on zkSync network. Keep
                    it safe and use it to receive funds.
                  </Text>
                  <Button
                    type="primary"
                    onClick={() => navigate('/dashboard')}
                    className="mt-4 w-full"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  type="primary"
                  onClick={handleCreate}
                  loading={loading}
                  className="w-full h-12 text-lg bg-primary-600 hover:bg-primary-700 border-none"
                >
                  Create New Wallet
                </Button>
                <Button
                  onClick={handleLogin}
                  loading={loading}
                  className="w-full h-12 text-lg border-2 border-primary-200 text-primary-700 hover:border-primary-300 hover:text-primary-800"
                >
                  Login with Passkey
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CreateSession({ onSuccess }: { onSuccess?: () => void }) {
  const { createSession, fetchAllSessions } = useSSOStore()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: {
    feeLimit: string
    transferRecipient: string
    valuePerUseLimit: string
    lifetimeLimit: string
    expirationHours: string
  }) => {
    setLoading(true)
    try {
      const sessionKey = generatePrivateKey()
      const sessionPublicKey = privateKeyToAddress(sessionKey)

      const session = {
        signer: sessionPublicKey,
        expiresAt: BigInt(
          Math.floor(Date.now() / 1000) +
            60 * 60 * parseInt(values.expirationHours)
        ), // Convert hours to seconds
        feeLimit: {
          limitType: LimitType.Lifetime,
          limit: BigInt(values.feeLimit),
          period: 0n,
        },
        transferPolicies: [
          {
            target: values.transferRecipient as `0x${string}`,
            maxValuePerUse: BigInt(values.valuePerUseLimit),
            valueLimit: {
              limitType: LimitType.Lifetime,
              limit: BigInt(values.lifetimeLimit),
              period: 0n,
            },
          },
        ],
        callPolicies: [],
      }

      await createSession(session)
      // Store the private key mapped to this session's public key
      localStorage.setItem(`sso.sessionKey.${sessionPublicKey}`, sessionKey)
      localStorage.setItem('sso.sessionKey', sessionKey)
      message.success('Session created successfully')
      form.resetFields()
      await fetchAllSessions()
      onSuccess?.()
    } catch (err) {
      console.error('Session creation error:', err)
      showError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title={<Text strong>Create New Session</Text>}
      className="session-card create-session"
      extra={
        <Text type="secondary" style={{ fontSize: '14px' }}>
          Create a new session to enable transactions
        </Text>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          feeLimit: '1000000000', // 1 Gwei
          transferRecipient: '0x0000000000000000000000000000000000000000',
          valuePerUseLimit: '1000000000000000', // 0.001 ETH
          lifetimeLimit: '10000000000000000', // 0.01 ETH
          expirationHours: '24', // Default 24 hours
        }}
      >
        <Form.Item
          name="expirationHours"
          label="Session Duration (Hours)"
          rules={[
            { required: true, message: 'Please input session duration' },
            { pattern: /^\d+$/, message: 'Please enter a valid number' },
          ]}
          tooltip="How long this session will be valid for"
        >
          <Input placeholder="e.g. 24" />
        </Form.Item>

        <Form.Item
          name="feeLimit"
          label="Fee Limit (Wei)"
          rules={[{ required: true, message: 'Please input fee limit' }]}
          tooltip="Maximum gas fee allowed for transactions in this session"
        >
          <Input placeholder="e.g. 1000000000" />
        </Form.Item>

        <Form.Item
          name="transferRecipient"
          label="Transfer Recipient Address"
          rules={[
            { required: true, message: 'Please input recipient address' },
            {
              pattern: /^0x[a-fA-F0-9]{40}$/,
              message: 'Invalid Ethereum address',
            },
          ]}
          tooltip="The address that can receive funds in this session"
        >
          <Input placeholder="0x..." />
        </Form.Item>

        <Form.Item
          name="valuePerUseLimit"
          label="Per-Transaction Limit (Wei)"
          rules={[
            { required: true, message: 'Please input per-transaction limit' },
          ]}
          tooltip="Maximum amount allowed per transaction"
        >
          <Input placeholder="e.g. 1000000000000000" />
        </Form.Item>

        <Form.Item
          name="lifetimeLimit"
          label="Lifetime Limit (Wei)"
          rules={[{ required: true, message: 'Please input lifetime limit' }]}
          tooltip="Total amount allowed for all transactions in this session"
        >
          <Input placeholder="e.g. 10000000000000000" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Create Session
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

function WalletDashboard() {
  const {
    address,
    getBalance,

    sessions,
    fetchAllSessions,
    sessionConfig,
    setSessionConfig,
    revokeSession,
    sendTransaction,
    isConnected,
  } = useSSOStore()

  const [balance, setBalance] = useState('0')
  const [loading, setLoading] = useState(false)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isNoSessionModalVisible, setIsNoSessionModalVisible] = useState(false)
  const [txStatus, setTxStatus] = useState<
    'pending' | 'success' | 'error' | null
  >(null)
  const [txError, setTxError] = useState<string | null>(null)
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null)
  const [form] = Form.useForm()

  // Load balance and sessions when component mounts or when address changes
  useEffect(() => {
    if (isConnected && address) {
      loadBalance()
      fetchAllSessions()
    }
  }, [isConnected, address])

  const loadBalance = async () => {
    if (!address) return

    try {
      setBalanceLoading(true)
      const bal = await getBalance()
      setBalance(bal)
    } catch (err) {
      console.error('Failed to load balance:', err)
      showError('Failed to load balance')
    } finally {
      setBalanceLoading(false)
    }
  }

  const handleSessionSelect = async (session: SessionConfig) => {
    // If clicking the already selected session, deselect it
    if (sessionConfig && session.signer === sessionConfig.signer) {
      setSessionConfig(null)
      localStorage.removeItem('sso.sessionKey')
      localStorage.setItem('sso.sessionDeselected', 'true')
      message.success('Session unselected')
      return
    }

    // Otherwise, select the new session
    const sessionKey = localStorage.getItem(`sso.sessionKey.${session.signer}`)
    if (sessionKey) {
      localStorage.setItem('sso.sessionKey', sessionKey)
      localStorage.removeItem('sso.sessionDeselected')
      setSessionConfig(session)
      message.success('Session selected')
    } else {
      message.error('Session key not found for this session')
    }
  }

  const handleSend = async (values: { recipient: string; amount: string }) => {
    try {
      if (!sessionConfig || !address) {
        setIsNoSessionModalVisible(true)
        return
      }

      setLoading(true)
      setTxHash(null)
      setTxStatus('pending')
      setTxError(null)
      setIsModalVisible(true)

      const sessionKey = localStorage.getItem('sso.sessionKey')
      if (!sessionKey) {
        throw new Error('Session key not found')
      }

      const tx = await sendTransaction(
        values.recipient as `0x${string}`,
        BigInt(values.amount)
      )

      setTxHash(tx)
      setTxStatus('success')
      message.success('Transaction sent successfully')
      await loadBalance()
      form.resetFields() // Reset form after successful transaction
    } catch (err) {
      console.error('Send transaction error:', err)
      setTxStatus('error')
      showError(err)

      // If session expired, clear the session config
      if (
        err instanceof Error &&
        (err.message.includes('Session has expired') ||
          err.message.includes('Session expired') ||
          err.message.includes('Invalid session'))
      ) {
        setSessionConfig(null)
        await fetchAllSessions() // Refresh sessions list
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSendToNullAddress = async () => {
    form.setFieldsValue({
      recipient: '0x0000000000000000000000000000000000000000',
      amount: '1',
    })
    // Submit the form after setting values
    form.submit()
  }

  const getTxExplorerLink = (hash: string) => {
    return `https://explorer.zkevm.cronos.org/testnet/tx/${hash}`
  }

  const isSessionActive = (session: any) => {
    return (
      sessionConfig &&
      session.session.signer === sessionConfig.signer &&
      session.session.transferPolicies[0]?.target ===
        sessionConfig.transferPolicies[0]?.target
    )
  }

  const isSessionExpired = (session: any) => {
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
    return currentTimestamp >= session.session.expiresAt
  }

  const handleRevoke = async (sessionId: string) => {
    try {
      setRevokeLoading(sessionId)
      await revokeSession(sessionId as `0x${string}`)
      message.success('Session revoked successfully')
      // If the revoked session was the active one, clear it
      if (sessionConfig && sessionId === sessionConfig.signer) {
        setSessionConfig(null)
      }
    } catch (err) {
      console.error('Error revoking session:', err)
      showError(err)
    } finally {
      setRevokeLoading(null)
      // Always refresh the sessions list to ensure it's up to date
      await fetchAllSessions()
    }
  }

  const renderModalContent = () => {
    switch (txStatus) {
      case 'pending':
        return (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
            />
            <p style={{ marginTop: '16px' }}>
              <Text>Processing Transaction...</Text>
            </p>
            <p>
              <Text type="secondary">
                Please wait while your transaction is being processed
              </Text>
            </p>
          </div>
        )
      case 'success':
        return (
          <div style={{ wordBreak: 'break-all' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <CheckCircleOutlined
                style={{ fontSize: '24px', color: '#52c41a' }}
              />
              <p>
                <Text strong>Transaction Successful!</Text>
              </p>
            </div>
            <p>
              <Text strong>Transaction Hash:</Text>
            </p>
            <p>
              <Text copyable>{txHash}</Text>
            </p>
            <p>
              <Text type="secondary">
                You can view the transaction details on the explorer by clicking
                the button below.
              </Text>
            </p>
          </div>
        )
      case 'error':
        return (
          <div style={{ wordBreak: 'break-all' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <CloseCircleOutlined
                style={{ fontSize: '24px', color: '#ff4d4f' }}
              />
              <p>
                <Text strong>Transaction Failed</Text>
              </p>
            </div>
            <p>
              <Text type="danger">{txError}</Text>
            </p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Title level={2}>Wallet Dashboard</Title>
          {address && (
            <div className="flex items-center space-x-2">
              <Text copyable={{ text: address }}>{address}</Text>
              <Text type="secondary">
                Balance:{' '}
                {balanceLoading ? <LoadingOutlined /> : `${balance} Wei`}
              </Text>
            </div>
          )}
        </div>
      </div>

      <CreateSession onSuccess={fetchAllSessions} />

      <Card title="Send Transaction" className="transaction-card">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSend}
          initialValues={{
            recipient: '',
            amount: '',
          }}
        >
          <Form.Item
            name="recipient"
            label="Recipient Address"
            rules={[
              { required: true, message: 'Please input recipient address' },
              {
                pattern: /^0x[a-fA-F0-9]{40}$/,
                message: 'Invalid Ethereum address',
              },
            ]}
          >
            <Input placeholder="0x..." />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount (Wei)"
            rules={[
              { required: true, message: 'Please input amount' },
              { pattern: /^\d+$/, message: 'Please enter a valid number' },
            ]}
          >
            <Input placeholder="Amount in Wei" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Send Transaction
              </Button>
              <Button onClick={handleSendToNullAddress} loading={loading}>
                Send 1 Wei to Null Address
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Modal
        title={
          txStatus === 'pending'
            ? 'Processing Transaction'
            : txStatus === 'success'
              ? 'Transaction Sent Successfully'
              : txStatus === 'error'
                ? 'Transaction Failed'
                : ''
        }
        open={isModalVisible}
        onOk={() => setIsModalVisible(false)}
        onCancel={() => setIsModalVisible(false)}
        footer={
          txStatus === 'pending'
            ? null
            : [
                ...(txStatus === 'success'
                  ? [
                      <Button
                        key="view"
                        type="primary"
                        href={txHash ? getTxExplorerLink(txHash) : '#'}
                        target="_blank"
                      >
                        View on Explorer
                      </Button>,
                    ]
                  : []),
                <Button key="close" onClick={() => setIsModalVisible(false)}>
                  Close
                </Button>,
              ]
        }
      >
        {renderModalContent()}
      </Modal>

      <Modal
        title="No Active Session"
        open={isNoSessionModalVisible}
        onOk={() => setIsNoSessionModalVisible(false)}
        onCancel={() => setIsNoSessionModalVisible(false)}
        footer={[
          <Button
            key="create"
            type="primary"
            onClick={() => setIsNoSessionModalVisible(false)}
          >
            OK
          </Button>,
        ]}
        className="rounded-lg overflow-hidden"
      >
        <div className="p-6 bg-yellow-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-yellow-800">
                No Active Session
              </h3>
              <p className="mt-2 text-sm text-yellow-700">
                Please create and select a session before attempting to send a
                transaction.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      <div className="sessions-container">
        <Text strong>Active Sessions:</Text>
        {sessions.map((session) => {
          const expired = isSessionExpired(session)
          return (
            <Card
              key={session.sessionId}
              size="small"
              className={`session-card ${isSessionActive(session) ? 'active' : ''} ${expired ? 'expired' : ''}`}
            >
              <div className="session-header">
                <div className="session-info">
                  <Text strong>Session ID:</Text>
                  <Text code copyable>
                    {session.sessionId}
                  </Text>
                  {expired && (
                    <Text type="danger" className="expired-tag">
                      Expired
                    </Text>
                  )}
                </div>
                <div className="session-actions">
                  <Button
                    type={isSessionActive(session) ? 'primary' : 'default'}
                    size="small"
                    onClick={() => handleSessionSelect(session.session)}
                    disabled={expired}
                  >
                    {isSessionActive(session) ? 'Selected' : 'Select'}
                  </Button>
                  <Button
                    danger
                    size="small"
                    loading={revokeLoading === session.sessionId}
                    onClick={() => handleRevoke(session.sessionId)}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
              <div className="session-details">
                <Text type="secondary">
                  Created: {new Date(session.timestamp).toLocaleString()}
                </Text>
                <br />
                <Text type={expired ? 'danger' : 'secondary'}>
                  Expires:{' '}
                  {new Date(
                    Number(session.session.expiresAt) * 1000
                  ).toLocaleString()}
                </Text>
                <br />
                <Text type="secondary">
                  Recipient: {session.session.transferPolicies[0]?.target}
                </Text>
                <br />
                <Text type="secondary">
                  Value Limit:{' '}
                  {BigInt(
                    session.session.transferPolicies[0]?.valueLimit.limit
                  ).toLocaleString()}{' '}
                  Wei
                </Text>
                <div
                  className="session-keys-container"
                  style={{ marginTop: '10px', display: 'flex', gap: '8px' }}
                >
                  <Popover
                    content={
                      <div>
                        <Text strong>Session Pubkey:</Text>
                        <Text code copyable>
                          {session.session.signer}
                        </Text>
                      </div>
                    }
                    trigger="click"
                    title="Session Public Key"
                  >
                    <Button size="small">Session Pubkey</Button>
                  </Popover>
                  <Popover
                    content={
                      <div style={{ position: 'relative' }}>
                        <Input
                          type="password"
                          value={
                            localStorage.getItem(
                              `sso.sessionKey.${session.session.signer}`
                            ) || 'Not available'
                          }
                          readOnly
                          style={{ paddingRight: '40px' }}
                        />
                        <Button
                          size="small"
                          style={{ position: 'absolute', right: 8, top: 4 }}
                          onClick={() => {
                            const sessionKey = localStorage.getItem(
                              `sso.sessionKey.${session.session.signer}`
                            )
                            if (sessionKey) {
                              navigator.clipboard.writeText(sessionKey)
                              message.success('Session key copied to clipboard')
                            }
                          }}
                          icon={<CopyOutlined />}
                          title="Copy to clipboard"
                          type="text"
                        />
                      </div>
                    }
                    trigger="click"
                    title="Session Private Key"
                  >
                    <Button size="small">Session Key</Button>
                  </Popover>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function TransferToken() {
  const {
    address,
    sessionConfig,
    sendTransaction,
    isConnected,
    loginWithPasskey,
    sessions,
    fetchAllSessions,
    setSessionConfig,
  } = useSSOStore()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [transferResult, setTransferResult] = useState<{
    hash?: string
    error?: string
  } | null>(null)
  const [hasUrlParams, setHasUrlParams] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [shouldRestoreSession] = useState(() => {
    // Only allow session restoration if there was no explicit deselection
    return localStorage.getItem('sso.sessionDeselected') !== 'true'
  })

  // Get query parameters
  const searchParams = new URLSearchParams(window.location.search)
  const recipientParam = searchParams.get('recipient')
  const amountParam = searchParams.get('amount')
  const dataParam = searchParams.get('data')

  const isSessionExpired = (session: any) => {
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
    return currentTimestamp >= session.session.expiresAt
  }

  // Restore active session if available
  useEffect(() => {
    const restoreSession = async () => {
      if (isConnected && !sessionConfig && shouldRestoreSession) {
        const sessionKey = localStorage.getItem('sso.sessionKey')
        if (sessionKey) {
          // Fetch all sessions to get the latest state
          await fetchAllSessions()

          // Find a non-expired session
          const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
          const activeSession = sessions.find(
            (s) =>
              !isSessionExpired(s) &&
              BigInt(s.session.expiresAt) > currentTimestamp
          )

          if (activeSession) {
            setSessionConfig(activeSession.session)
          } else {
            // If we found no valid session, clear the stored session key
            //localStorage.removeItem('sso.sessionKey');
            setSessionConfig(null)
          }
        }
      }
    }
    restoreSession()
  }, [isConnected, sessionConfig, sessions, shouldRestoreSession])

  // Handle auto-login when URL parameters are present
  useEffect(() => {
    const autoLogin = async () => {
      if (!isConnected && (recipientParam || amountParam || dataParam)) {
        try {
          setLoginLoading(true)
          await loginWithPasskey()
          message.success('Logged in successfully')
        } catch (err) {
          showError(err)
        } finally {
          setLoginLoading(false)
        }
      }
    }
    autoLogin()
  }, [isConnected, recipientParam, amountParam, dataParam, loginWithPasskey])

  // Set form values from URL parameters on component mount
  useEffect(() => {
    if (recipientParam || amountParam || dataParam) {
      form.setFieldsValue({
        recipient: recipientParam || '',
        amount: amountParam || '',
        data: dataParam || '',
      })
      setHasUrlParams(true)

      // Validate the form after setting values
      form.validateFields().catch(() => {
        // Validation error is handled by the form display
      })
    }
  }, [recipientParam, amountParam, dataParam, form])

  const handleTransfer = async (values: {
    recipient: string
    amount: string
    data?: string
  }) => {
    try {
      setLoading(true)
      if (!sessionConfig) {
        throw new Error('No active session')
      }

      const tx = await sendTransaction(
        values.recipient as `0x${string}`,
        BigInt(values.amount),
        values.data ? (values.data as `0x${string}`) : undefined
      )

      setTransferResult({ hash: tx })
      setShowModal(true)
      form.resetFields()
      setHasUrlParams(false)

      // Clear URL parameters after successful transfer
      navigate('/transfer-token')
    } catch (err) {
      showError(err)
      setTransferResult({
        error: err instanceof Error ? err.message : 'Transfer failed',
      })
      setShowModal(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Transfer Token" className="max-w-3xl mx-auto">
        <div className="space-y-4">
          {!isConnected ? (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <Text type="warning">
                Please log in to proceed with the transaction.
              </Text>
              <div className="mt-2">
                <Button
                  type="primary"
                  onClick={() => loginWithPasskey()}
                  loading={loginLoading}
                >
                  Login with Passkey
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 p-4 rounded-lg">
                <Text strong>From Address: </Text>
                <Text code copyable className="ml-2">
                  {address}
                </Text>
              </div>

              {hasUrlParams && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <Text strong>Transaction Parameters Detected</Text>
                  <div className="mt-2">
                    <Text type="secondary">
                      The form has been pre-filled with the provided parameters.
                      Please review and click "Transfer Tokens" to proceed.
                    </Text>
                  </div>
                </div>
              )}

              {sessionConfig ? (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <Text strong>Active Session: </Text>
                  <Text code copyable className="ml-2">
                    {sessions.find(
                      (s) => s.session.signer === sessionConfig.signer
                    )?.sessionId || 'Unknown'}
                  </Text>
                  <div className="mt-2">
                    <Text type="secondary">
                      Transfer Limit:{' '}
                      {BigInt(
                        sessionConfig.transferPolicies[0]?.valueLimit.limit
                      ).toLocaleString()}{' '}
                      Wei
                    </Text>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <Text type="warning">
                    No active session. Please select or create a session in the
                    dashboard first.
                  </Text>
                  <div className="mt-2">
                    <Button
                      type="primary"
                      onClick={() => navigate('/dashboard')}
                    >
                      Go to Dashboard
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleTransfer}
            disabled={!isConnected || !sessionConfig || loading}
          >
            <Form.Item
              name="recipient"
              label="Recipient Address"
              rules={[
                { required: true, message: 'Please input recipient address' },
                {
                  pattern: /^0x[a-fA-F0-9]{40}$/,
                  message: 'Invalid Ethereum address',
                },
              ]}
            >
              <Input placeholder="0x..." />
            </Form.Item>

            <Form.Item
              name="amount"
              label="Amount (Wei)"
              rules={[
                { required: true, message: 'Please input amount' },
                { pattern: /^\d+$/, message: 'Please enter a valid number' },
              ]}
              extra={
                sessionConfig && (
                  <Text type="secondary">
                    Max per transfer:{' '}
                    {BigInt(
                      sessionConfig.transferPolicies[0]?.maxValuePerUse
                    ).toLocaleString()}{' '}
                    Wei
                  </Text>
                )
              }
            >
              <Input placeholder="Amount in Wei" />
            </Form.Item>

            <Form.Item
              name="data"
              label="Transaction Data (Optional)"
              tooltip="Hex encoded data to be included in the transaction"
              extra={
                <Text type="secondary">
                  Leave empty for a simple transfer. Include hex-encoded data
                  for contract interactions.
                </Text>
              }
            >
              <Input.TextArea
                placeholder="0x..."
                autoSize={{ minRows: 2, maxRows: 6 }}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={!isConnected || !sessionConfig}
                block
                size="large"
              >
                Transfer Tokens
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Card>

      <Modal
        title={transferResult?.hash ? 'Transfer Successful' : 'Transfer Failed'}
        open={showModal}
        onOk={() => setShowModal(false)}
        onCancel={() => setShowModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowModal(false)}>
            Close
          </Button>,
          transferResult?.hash && (
            <Button
              key="explorer"
              type="primary"
              href={`https://explorer.zkevm.cronos.org/testnet/tx/${transferResult.hash}`}
              target="_blank"
            >
              View on Explorer
            </Button>
          ),
        ]}
      >
        {transferResult?.hash ? (
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircleOutlined className="text-green-500 text-xl" />
              <Text strong>Transfer completed successfully!</Text>
            </div>
            <Text>Transaction Hash:</Text>
            <div className="bg-gray-50 p-2 rounded mt-2">
              <Text code copyable>
                {transferResult.hash}
              </Text>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <CloseCircleOutlined className="text-red-500 text-xl" />
              <Text strong>Transfer failed</Text>
            </div>
            <Text type="danger">{transferResult?.error}</Text>
          </div>
        )}
      </Modal>
    </div>
  )
}

// Agent page component for automated transactions
function AgentPage() {
  const { sessionConfig, sendTransaction } = useSSOStore()
  const [receiver, setReceiver] = useState<string>(
    '0x0000000000000000000000000000000000000000'
  )
  const [amount, setAmount] = useState<string>('1') // Default to 1 wei (smallest unit)
  const [intervalTime, setIntervalTime] = useState<number>(60) // Default 1 minute in seconds
  const [remainingTime, setRemainingTime] = useState<number>(0)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [status, setStatus] = useState<string>('')
  // Add transaction history state
  const [txHistory, setTxHistory] = useState<
    Array<{
      txHash: string
      timestamp: Date
      amount: string
      receiver: string
    }>
  >([])
  const timerRef = useRef<number | null>(null)
  const countdownRef = useRef<number | null>(null)

  // Check if a session is active
  const hasActiveSession = sessionConfig !== null

  // Start the transaction agent
  const startAgent = () => {
    if (!hasActiveSession) {
      message.error('No active session. Please select a session first.')
      return
    }

    if (!receiver) {
      message.error('Please enter a receiver address')
      return
    }

    if (!amount || parseInt(amount) <= 0) {
      message.error('Please enter a valid amount')
      return
    }

    setIsRunning(true)
    setRemainingTime(intervalTime)
    setStatus('Agent started')

    // Start countdown timer
    countdownRef.current = window.setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          return intervalTime // Reset the timer when it reaches 0
        }
        return prev - 1
      })
    }, 1000)

    // Immediate first transaction
    sendAgentTransaction()

    // Setup interval for recurring transactions
    timerRef.current = window.setInterval(() => {
      sendAgentTransaction()
    }, intervalTime * 1000)
  }

  // Stop the transaction agent
  const stopAgent = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (countdownRef.current !== null) {
      window.clearInterval(countdownRef.current)
      countdownRef.current = null
    }

    setIsRunning(false)
    setRemainingTime(0)
    setStatus('Agent stopped')
  }

  // Send a transaction using the active session
  const sendAgentTransaction = async () => {
    if (!sessionConfig) return

    try {
      // Use the amount directly as BigInt without conversion
      const bigintAmount = BigInt(amount)
      const txHash = await sendTransaction(
        receiver as `0x${string}`,
        bigintAmount
      )

      const now = new Date()
      // Format date and time with seconds precision
      const formattedTimestamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
      const statusMessage = `Transaction sent at ${formattedTimestamp}!`

      // Add to transaction history
      setTxHistory((prev) => [
        {
          txHash,
          timestamp: now,
          amount,
          receiver,
        },
        ...prev,
      ])

      setStatus(statusMessage)
      message.success('Transaction sent successfully!')
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      )
      showError(error)
      // Stop the agent if there's an error
      stopAgent()
    }
  }

  // Format transaction hash for display
  const formatTxHash = (hash: string) => {
    if (!hash) return ''
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`
  }

  // Format date with seconds precision
  const formatDate = (date: Date) => {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
      if (countdownRef.current !== null)
        window.clearInterval(countdownRef.current)
    }
  }, [])

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="mb-8 shadow-md">
        <Title level={3}>Transaction Agent</Title>
        <Text className="block mb-4">
          This will periodically send transactions using your active session.
        </Text>

        {!hasActiveSession && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <Text type="warning">
              No active session selected. Please go to the Dashboard to select
              an active session.
            </Text>
          </div>
        )}

        <Form layout="vertical">
          <Form.Item label="Receiver Address">
            <Input
              placeholder="0x..."
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              disabled={isRunning}
            />
          </Form.Item>

          <Form.Item label="Amount to Send (wei)">
            <Input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isRunning}
            />
            <Text type="secondary" className="mt-1 block text-xs">
              1 ETH = 10^18 wei. For 0.001 ETH, enter 1000000000000000 (10^15)
            </Text>
          </Form.Item>

          <Form.Item label="Interval (seconds)">
            <Input
              type="number"
              min="5"
              value={intervalTime}
              onChange={(e) => setIntervalTime(parseInt(e.target.value))}
              disabled={isRunning}
            />
          </Form.Item>

          <div className="mb-4">
            <Text strong>Status:</Text> {status}
          </div>

          {isRunning && (
            <div className="mb-4">
              <Text strong>Next transaction in:</Text> {remainingTime} seconds
            </div>
          )}

          <Form.Item>
            <Space>
              {!isRunning ? (
                <Button
                  type="primary"
                  onClick={startAgent}
                  disabled={!hasActiveSession}
                >
                  Start Agent
                </Button>
              ) : (
                <Button danger onClick={stopAgent}>
                  Stop Agent
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Transaction History */}
      {txHistory.length > 0 && (
        <Card className="shadow-md" title="Transaction History">
          <div className="overflow-y-auto max-h-80">
            {txHistory.map((tx, index) => (
              <div
                key={index}
                className="mb-4 p-3 border border-gray-200 rounded-md"
              >
                <div className="grid grid-cols-1 gap-1">
                  <div>
                    <Text strong>TX Hash:</Text>
                    <Text copyable={{ text: tx.txHash }}>
                      {formatTxHash(tx.txHash)}
                    </Text>
                  </div>
                  <div>
                    <Text strong>Time:</Text> {formatDate(tx.timestamp)}
                  </div>
                  <div>
                    <Text strong>Amount:</Text> {tx.amount} wei
                  </div>
                  <div>
                    <Text strong>Receiver:</Text>
                    <Text copyable={{ text: tx.receiver }}>
                      {tx.receiver.substring(0, 10)}...
                      {tx.receiver.substring(tx.receiver.length - 8)}
                    </Text>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function AppContent() {
  const { isConnected, logout } = useSSOStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-primary-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <Link
                to="/"
                className="text-white hover:text-primary-100 font-medium"
              >
                Home
              </Link>
              <Link
                to="/setup"
                className="text-white hover:text-primary-100 font-medium"
              >
                Setup Wallet
              </Link>
              {isConnected && (
                <>
                  <Link
                    to="/dashboard"
                    className="text-white hover:text-primary-100 font-medium"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/transfer-token"
                    className="text-white hover:text-primary-100 font-medium"
                  >
                    Transfer Token
                  </Link>
                  <Link
                    to="/agent"
                    className="text-white hover:text-primary-100 font-medium"
                  >
                    Agent
                  </Link>
                </>
              )}
            </div>
            {isConnected && (
              <Button
                type="link"
                onClick={handleLogout}
                className="text-white hover:text-primary-100 font-medium"
              >
                Logout
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white">
        <Routes>
          <Route path="*" element={<Navigate to="/transfer-token" replace />} />
          <Route
            path="/"
            element={
              <div className="text-center py-16">
                <h1 className="text-5xl font-bold text-primary-900 mb-8">
                  Welcome to SSO Wallet
                </h1>
                <p className="text-xl text-primary-700">
                  Your secure gateway to Web3
                </p>
                <div className="mt-12">
                  <Link
                    to="/setup"
                    className="inline-block px-8 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            }
          />
          <Route path="/setup" element={<WalletSetup />} />
          <Route path="/dashboard/*" element={<WalletDashboard />} />
          <Route path="/transfer-token" element={<TransferToken />} />
          <Route path="/agent" element={<AgentPage />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  const { loginWithPasskey } = useSSOStore()

  useEffect(() => {
    const restoreLoginState = async () => {
      const isLoggedIn = localStorage.getItem('sso.logined') === 'true'
      if (isLoggedIn) {
        try {
          await loginWithPasskey()
        } catch (error) {
          console.error('Failed to restore login state:', error)
          // Only clear login state for authentication or account errors
          if (
            error instanceof Error &&
            (error.message.includes('authentication') ||
              error.message.includes('account not found') ||
              error.message.includes('Invalid credential'))
          ) {
            localStorage.setItem('sso.logined', 'false')
          }
          // Don't clear other localStorage items here
        }
      }
    }
    restoreLoginState()
  }, [])

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
