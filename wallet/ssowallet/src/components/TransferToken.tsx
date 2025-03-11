import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Typography, Form, Input, message, Modal } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useSSOStore } from '../services/useSSOStore'
import { useSessionManagement } from '../hooks/useSessionManagement'
import { showError, getTxExplorerLink } from '../AppUtils'

const { Text } = Typography

export function TransferToken() {
  const { address, sendTransaction, isConnected, loginWithPasskey } =
    useSSOStore()
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

  const { sessionConfig } = useSessionManagement()

  const searchParams = new URLSearchParams(window.location.search)
  const recipientParam = searchParams.get('recipient')
  const amountParam = searchParams.get('amount')
  const dataParam = searchParams.get('data')

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

  useEffect(() => {
    if (recipientParam || amountParam || dataParam) {
      form.setFieldsValue({
        recipient: recipientParam || '',
        amount: amountParam || '',
        data: dataParam || '',
      })
      setHasUrlParams(true)

      form.validateFields().catch(() => {})
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
                  <Text strong>Active Session</Text>
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
              href={getTxExplorerLink(transferResult.hash)}
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
