import { useState } from 'react'
import { Card, Form, Input, Button, Typography, message } from 'antd'
import { generatePrivateKey, privateKeyToAddress } from 'viem/accounts'
import { LimitType } from 'zksync-sso/utils'
import { useSSOStore } from '../services/useSSOStore'
import { showError } from '../AppUtils'

const { Text } = Typography

interface CreateSessionProps {
  onSuccess?: () => void
}

export function CreateSession({ onSuccess }: CreateSessionProps) {
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
        ),
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
