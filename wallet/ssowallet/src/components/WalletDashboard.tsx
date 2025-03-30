import { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Typography,
  Form,
  Input,
  message,
  Modal,
  Popover,
  Space,
  Spin,
} from 'antd'
import {
  CopyOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { useSSOStore } from '../services/useSSOStore'
import { showError, getTxExplorerLink, isSessionExpired } from '../AppUtils'
import { useSessionManagement } from '../hooks/useSessionManagement'
import { CreateSession } from './CreateSession'

const { Text, Title } = Typography

export function WalletDashboard() {
  const {
    address,
    getBalance,
    sessions,
    fetchAllSessions,
    revokeSession,
    sendTransaction,
    isConnected,
  } = useSSOStore()

  const { sessionConfig, handleSessionSelect } = useSessionManagement()
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
      form.resetFields()
    } catch (err) {
      console.error('Send transaction error:', err)
      setTxStatus('error')
      setTxError(err instanceof Error ? err.message : 'Transaction failed')
      showError(err)

      if (
        err instanceof Error &&
        (err.message.includes('Session has expired') ||
          err.message.includes('Session expired') ||
          err.message.includes('Invalid session'))
      ) {
        await fetchAllSessions()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (sessionId: string) => {
    try {
      setRevokeLoading(sessionId)
      await revokeSession(sessionId as `0x${string}`)
      message.success('Session revoked successfully')
      await fetchAllSessions()
    } catch (err) {
      console.error('Error revoking session:', err)
      showError(err)
    } finally {
      setRevokeLoading(null)
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
          initialValues={{ recipient: '', amount: '' }}
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
            <Button type="primary" htmlType="submit" loading={loading}>
              Send Transaction
            </Button>
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
        footer={[
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
        ]}
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
              className={`session-card ${sessionConfig?.signer === session.session.signer ? 'active' : ''} ${expired ? 'expired' : ''}`}
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
                    type={
                      sessionConfig?.signer === session.session.signer
                        ? 'primary'
                        : 'default'
                    }
                    size="small"
                    onClick={() => handleSessionSelect(session.session)}
                    disabled={expired}
                  >
                    {sessionConfig?.signer === session.session.signer
                      ? 'Selected'
                      : 'Select'}
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
                        {(() => {
                          const sessionKey = localStorage.getItem(
                            `sso.sessionKey.${session.session.signer}`
                          )
                          return (
                            <>
                              <Input
                                type="password"
                                value={sessionKey || 'Not available'}
                                readOnly
                                style={{ paddingRight: '40px' }}
                              />
                              <Button
                                size="small"
                                style={{
                                  position: 'absolute',
                                  right: 8,
                                  top: 4,
                                }}
                                onClick={() => {
                                  if (sessionKey) {
                                    navigator.clipboard.writeText(sessionKey)
                                    message.success(
                                      'Session key copied to clipboard'
                                    )
                                  }
                                }}
                                icon={<CopyOutlined />}
                                title="Copy to clipboard"
                                type="text"
                              />
                            </>
                          )
                        })()}
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
