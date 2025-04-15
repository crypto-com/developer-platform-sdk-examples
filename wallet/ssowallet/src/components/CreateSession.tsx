import { useState } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  message,
  Space,
  Modal,
  List,
  Divider,
} from 'antd'
import { generatePrivateKey, privateKeyToAddress } from 'viem/accounts'
import { getFunctionSelector } from 'viem'
import {
  LimitType,
  type CallPolicy,
  type Constraint,
  type Limit,
} from 'zksync-sso/utils'
import { useSSOStore } from '../services/useSSOStore'
import { showError } from '../AppUtils'
import {
  DeleteOutlined,
  PlusOutlined,
  CalculatorOutlined,
} from '@ant-design/icons'
import { NULL_ADDRESS } from '../services/constants'

const { Text } = Typography

// Utility functions for Wei/ETH conversion
const weiToEth = (wei: string): string => {
  try {
    const weiNum = BigInt(wei)
    return (Number(weiNum) / 1e18).toFixed(18)
  } catch {
    return '0'
  }
}

const WeiInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) => (
  <Space direction="vertical" style={{ width: '100%' }}>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      addonAfter="Wei"
    />
    <Text type="secondary" style={{ fontSize: '12px' }}>
      ≈ {weiToEth(value)} ETH
    </Text>
  </Space>
)

interface TransferPolicyState {
  target: string
  maxValuePerUse: string
  valueLimit: {
    limitType: LimitType
    limit: string
    period: string
  }
}

interface CallPolicyState {
  target: string
  maxValuePerUse: string
  valueLimit: {
    limitType: LimitType
    limit: string
    period: string
  }
  selector: string
  constraints: {
    index: string
    condition: number
    refValue: string
    limitType: LimitType
    limit: string
    period: string
  }[]
}

interface CreateSessionProps {
  onSuccess?: () => void
}

function FunctionSelectorModal({
  visible,
  onClose,
  onSelectSelector,
}: {
  visible: boolean
  onClose: () => void
  onSelectSelector: (selector: string) => void
}) {
  const [customSignature, setCustomSignature] = useState('')
  const [computedSelector, setComputedSelector] = useState('')

  const commonSelectors = [
    {
      name: 'approve(address,uint256)',
      selector: '0x095ea7b3',
      description: 'ERC20 approve',
    },
    {
      name: 'transfer(address,uint256)',
      selector: '0xa9059cbb',
      description: 'ERC20 transfer',
    },
    {
      name: 'balanceOf(address)',
      selector: '0x70a08231',
      description: 'ERC20 balanceOf',
    },
  ]

  const computeSelector = () => {
    try {
      const selector = getFunctionSelector(customSignature)
      setComputedSelector(selector)
    } catch (error) {
      message.error('Invalid function signature format')
    }
  }

  return (
    <Modal
      title="Compute Function Selector"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Typography.Title level={5}>
            Common Function Selectors
          </Typography.Title>
          <List
            dataSource={commonSelectors}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    onClick={() => {
                      onSelectSelector(item.selector)
                      onClose()
                    }}
                  >
                    Use
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={item.name}
                  description={`${item.description} (${item.selector})`}
                />
              </List.Item>
            )}
          />
        </div>

        <div>
          <Typography.Title level={5}>Compute Custom Selector</Typography.Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="Enter function signature (e.g. transfer(address,uint256))"
                value={customSignature}
                onChange={(e) => setCustomSignature(e.target.value)}
                onPressEnter={computeSelector}
              />
              <Button
                onClick={computeSelector}
                style={{
                  backgroundColor: '#1890ff',
                  color: 'white',
                  borderColor: '#1890ff',
                }}
                onMouseEnter={(e) => {
                  const target = e.currentTarget
                  target.style.backgroundColor = '#40a9ff'
                  target.style.borderColor = '#40a9ff'
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget
                  target.style.backgroundColor = '#1890ff'
                  target.style.borderColor = '#1890ff'
                }}
              >
                Compute
              </Button>
            </Space.Compact>

            {computedSelector && (
              <List>
                <List.Item
                  actions={[
                    <Button
                      type="link"
                      onClick={() => {
                        onSelectSelector(computedSelector)
                        onClose()
                      }}
                    >
                      Use
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={customSignature}
                    description={`Computed selector: ${computedSelector}`}
                  />
                </List.Item>
              </List>
            )}
          </Space>
        </div>
      </Space>
    </Modal>
  )
}

export function CreateSession({ onSuccess }: CreateSessionProps) {
  const { createSession, fetchAllSessions, sendTransaction, sessionConfig } =
    useSSOStore()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [sendLoading, setSendLoading] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [txStatus, setTxStatus] = useState<
    'pending' | 'success' | 'error' | null
  >(null)
  const [txError, setTxError] = useState<string | null>(null)
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [feeLimitState, setFeeLimitState] = useState({
    limitType: LimitType.Lifetime,
    limit: '1000000000',
    period: '0',
  })
  const [transferPolicies, setTransferPolicies] = useState<
    TransferPolicyState[]
  >([
    {
      target: '0x0000000000000000000000000000000000000000',
      maxValuePerUse: '1000000000000000',
      valueLimit: {
        limitType: LimitType.Lifetime,
        limit: '10000000000000000',
        period: '0',
      },
    },
  ])
  const [callPolicies, setCallPolicies] = useState<CallPolicyState[]>([])
  const [modalVisibleForPolicy, setModalVisible] = useState<number | null>(null)

  // Add contract constants
  const CONTRACTS = {
    WZKCRO: '0xeD73b53197189BE3Ff978069cf30eBc28a8B5837',
    ROUTER: '0x9EB4db2E31259444c5C2123bec8B17a510C4c72B',
    VUSD: '0x9553dA89510e33BfE65fcD71c1874FF1D6b0dD75',
    NULL_ADDRESS: '0x0000000000000000000000000000000000000000',
  } as const

  const SELECTORS = {
    DEPOSIT: '0xd0e30db0', // deposit()
    APPROVE: '0x095ea7b3', // approve(address,uint256)
    SWAP: '0x472b43f3', // swapExactTokensForTokens(uint256,uint256,address[],address)
    WITHDRAW: '0x2e1a7d4d', // withdraw(uint256)
  } as const

  // Add configuration function
  const configureSwapPolicies = () => {
    // Configure transfer policies
    setTransferPolicies([
      {
        // WZKCRO deposit policy
        target: CONTRACTS.WZKCRO,
        maxValuePerUse: '1000000000000000000', // 1 WZKCRO
        valueLimit: {
          limitType: LimitType.Lifetime,
          limit: '10000000000000000000', // 10 WZKCRO
          period: '0',
        },
      },
      {
        // Null address policy for testing
        target: CONTRACTS.NULL_ADDRESS,
        maxValuePerUse: '1000000000000000000', // 1 WZKCRO
        valueLimit: {
          limitType: LimitType.Lifetime,
          limit: '10000000000000000000', // 10 WZKCRO
          period: '0',
        },
      },
    ])

    // Configure call policies
    setCallPolicies([
      {
        // WZKCRO deposit policy
        target: CONTRACTS.WZKCRO,
        selector: SELECTORS.DEPOSIT,
        maxValuePerUse: '1000000000000000000', // 1 WZKCRO
        valueLimit: {
          limitType: LimitType.Lifetime,
          limit: '10000000000000000000', // 10 WZKCRO
          period: '0',
        },
        constraints: [],
      },
      {
        // WZKCRO approve policy
        target: CONTRACTS.WZKCRO,
        selector: SELECTORS.APPROVE,
        maxValuePerUse: '0',
        valueLimit: {
          limitType: LimitType.Unlimited,
          limit: '0',
          period: '0',
        },
        constraints: [],
      },
      {
        // VUSD approve policy
        target: CONTRACTS.VUSD,
        selector: SELECTORS.APPROVE,
        maxValuePerUse: '0',
        valueLimit: {
          limitType: LimitType.Unlimited,
          limit: '0',
          period: '0',
        },
        constraints: [],
      },
      {
        // WZKCRO withdraw policy
        target: CONTRACTS.WZKCRO,
        selector: SELECTORS.WITHDRAW,
        maxValuePerUse: '1000000000000000000', // 1 WZKCRO
        valueLimit: {
          limitType: LimitType.Lifetime,
          limit: '10000000000000000000', // 10 WZKCRO
          period: '0',
        },
        constraints: [],
      },
      {
        // Router swap policy
        target: CONTRACTS.ROUTER,
        selector: SELECTORS.SWAP,
        maxValuePerUse: '0',
        valueLimit: {
          limitType: LimitType.Unlimited,
          limit: '0',
          period: '0',
        },
        constraints: [],
      },
    ])
  }

  const addTransferPolicy = () => {
    setTransferPolicies([
      ...transferPolicies,
      {
        target: '0x0000000000000000000000000000000000000000',
        maxValuePerUse: '1000000000000000',
        valueLimit: {
          limitType: LimitType.Lifetime,
          limit: '10000000000000000',
          period: '0',
        },
      },
    ])
  }

  const removeTransferPolicy = (index: number) => {
    const newPolicies = [...transferPolicies]
    newPolicies.splice(index, 1)
    setTransferPolicies(newPolicies)
  }

  const updateTransferPolicy = (
    index: number,
    field:
      | keyof TransferPolicyState
      | 'valueLimit.limit'
      | 'valueLimit.limitType'
      | 'valueLimit.period',
    value: string | LimitType
  ) => {
    const newPolicies = [...transferPolicies]
    if (
      field === 'valueLimit.limit' ||
      field === 'valueLimit.limitType' ||
      field === 'valueLimit.period'
    ) {
      const [parent, child] = field.split('.') as [
        'valueLimit',
        'limit' | 'limitType' | 'period',
      ]
      newPolicies[index] = {
        ...newPolicies[index],
        valueLimit: {
          ...newPolicies[index].valueLimit,
          [child]: value,
        },
      }
    } else {
      newPolicies[index] = {
        ...newPolicies[index],
        [field as keyof TransferPolicyState]: value,
      }
    }
    setTransferPolicies(newPolicies)
  }

  const addCallPolicy = () => {
    setCallPolicies([
      ...callPolicies,
      {
        target: '0x0000000000000000000000000000000000000000',
        maxValuePerUse: '1000000000000000',
        valueLimit: {
          limitType: LimitType.Lifetime,
          limit: '10000000000000000',
          period: '0',
        },
        selector: '0x00000000',
        constraints: [],
      },
    ])
  }

  const removeCallPolicy = (index: number) => {
    const newPolicies = [...callPolicies]
    newPolicies.splice(index, 1)
    setCallPolicies(newPolicies)
  }

  const updateCallPolicy = (
    index: number,
    field:
      | keyof CallPolicyState
      | 'valueLimit.limit'
      | 'valueLimit.limitType'
      | 'valueLimit.period',
    value: string | LimitType
  ) => {
    const newPolicies = [...callPolicies]
    if (
      field === 'valueLimit.limit' ||
      field === 'valueLimit.limitType' ||
      field === 'valueLimit.period'
    ) {
      const [parent, child] = field.split('.') as [
        'valueLimit',
        'limit' | 'limitType' | 'period',
      ]
      newPolicies[index] = {
        ...newPolicies[index],
        valueLimit: {
          ...newPolicies[index].valueLimit,
          [child]: value,
        },
      }
    } else {
      newPolicies[index] = {
        ...newPolicies[index],
        [field as keyof CallPolicyState]: value,
      }
    }
    setCallPolicies(newPolicies)
  }

  const addConstraint = (policyIndex: number) => {
    const newPolicies = [...callPolicies]
    newPolicies[policyIndex].constraints.push({
      index: '0',
      condition: 1, // Equal by default
      refValue:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      limitType: LimitType.Lifetime,
      limit: '0',
      period: '0',
    })
    setCallPolicies(newPolicies)
  }

  const removeConstraint = (policyIndex: number, constraintIndex: number) => {
    const newPolicies = [...callPolicies]
    newPolicies[policyIndex].constraints.splice(constraintIndex, 1)
    setCallPolicies(newPolicies)
  }

  const updateConstraint = (
    policyIndex: number,
    constraintIndex: number,
    field: keyof CallPolicyState['constraints'][0],
    value: string | number
  ) => {
    const newPolicies = [...callPolicies]
    newPolicies[policyIndex].constraints[constraintIndex] = {
      ...newPolicies[policyIndex].constraints[constraintIndex],
      [field]: value,
    }
    setCallPolicies(newPolicies)
  }

  const handleSubmit = async (values: {
    feeLimit: string
    expirationHours: string
  }) => {
    setLoading(true)
    try {
      const sessionKey = generatePrivateKey()
      const sessionPublicKey = privateKeyToAddress(sessionKey)

      const createLimit = (
        limitValue: string,
        period: string = '0'
      ): Limit => ({
        limitType: period === '0' ? LimitType.Lifetime : LimitType.Allowance,
        limit: BigInt(limitValue),
        period: BigInt(period),
      })

      const session = {
        signer: sessionPublicKey,
        expiresAt: BigInt(
          Math.floor(Date.now() / 1000) +
            60 * 60 * parseInt(values.expirationHours)
        ),
        feeLimit: {
          limitType: feeLimitState.limitType,
          limit: BigInt(feeLimitState.limit),
          period: BigInt(feeLimitState.period || '0'),
        },
        transferPolicies: transferPolicies.map((policy) => ({
          target: policy.target as `0x${string}`,
          maxValuePerUse: BigInt(policy.maxValuePerUse),
          valueLimit: {
            limitType: policy.valueLimit.limitType,
            limit: BigInt(policy.valueLimit.limit),
            period: BigInt(policy.valueLimit.period || '0'),
          },
        })),
        callPolicies: callPolicies.map((policy) => ({
          target: policy.target as `0x${string}`,
          maxValuePerUse: BigInt(policy.maxValuePerUse),
          valueLimit: {
            limitType: policy.valueLimit.limitType,
            limit: BigInt(policy.valueLimit.limit),
            period: BigInt(policy.valueLimit.period || '0'),
          },
          selector: policy.selector as `0x${string}`,
          constraints: policy.constraints.map((constraint) => ({
            index: BigInt(constraint.index),
            condition: constraint.condition,
            refValue: constraint.refValue as `0x${string}`,
            limit: {
              limitType: constraint.limitType,
              limit: BigInt(constraint.limit),
              period: BigInt(constraint.period || '0'),
            },
          })),
        })),
      }
      // Convert BigInt values to strings for JSON serialization
      const processForJson = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) {
          return typeof obj === 'bigint' ? obj.toString() : obj
        }

        if (Array.isArray(obj)) {
          return obj.map((item) => processForJson(item))
        }

        return Object.fromEntries(
          Object.entries(obj).map(([key, value]) => [
            key,
            processForJson(value),
          ])
        )
      }

      // debuging code
      console.log(
        'Session config:',
        JSON.stringify(processForJson(session), null, 2)
      )
      //alert('Session config:', JSON.stringify(processForJson(session), null, 2));
      // Show confirmation dialog before proceeding
      const confirmed = await new Promise((resolve) => {
        Modal.confirm({
          title: 'Create Session',
          content:
            'Are you sure you want to create this session with the specified configuration?',
          okText: 'Yes',
          cancelText: 'No',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
          okButtonProps: {
            style: {
              backgroundColor: '#1890ff',
              borderColor: '#1890ff',
              color: '#ffffff',
            },
          },
        })
      })

      if (!confirmed) {
        setLoading(false)
        return
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

  const handleSend = async (values: { recipient: string; amount: string }) => {
    try {
      setSendLoading(true)
      setTxHash(null)
      setTxStatus('pending')
      setTxError(null)
      setIsModalVisible(true)

      const tx = await sendTransaction(
        values.recipient as `0x${string}`,
        BigInt(values.amount)
      )

      setTxHash(tx)
      setTxStatus('success')
      message.success('Transaction sent successfully')
      form.resetFields()
    } catch (err) {
      console.error('Send transaction error:', err)
      setTxStatus('error')
      setTxError(err instanceof Error ? err.message : 'Transaction failed')
      showError(err)
    } finally {
      setSendLoading(false)
    }
  }

  const handleSendToNullAddress = async () => {
    form.setFieldsValue({
      recipient: NULL_ADDRESS,
      amount: '1',
    })
    form.submit()
  }

  const getTxExplorerLink = (hash: string) => {
    return `https://explorer.zkevm.cronos.org/testnet/tx/${hash}`
  }

  const hoursToSeconds = (hours: string): string => {
    const hoursNum = parseFloat(hours)
    return isNaN(hoursNum) ? '0' : Math.floor(hoursNum * 3600).toString()
  }

  const secondsToHours = (seconds: string): string => {
    const secondsNum = parseFloat(seconds)
    return isNaN(secondsNum) ? '0' : (secondsNum / 3600).toString()
  }

  const isSessionActive = (session: any) => {
    return (
      sessionConfig &&
      session.session.signer === sessionConfig.signer &&
      session.session.transferPolicies[0]?.target ===
        sessionConfig.transferPolicies[0]?.target
    )
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
          feeLimit: '1000000000',
          expirationHours: '24',
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
          label="Fee Limit"
          required
          tooltip="Maximum gas fee allowed for transactions in this session"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item label="Limit Type" required>
              <select
                value={feeLimitState.limitType}
                onChange={(e) =>
                  setFeeLimitState({
                    ...feeLimitState,
                    limitType: parseInt(e.target.value),
                  })
                }
                style={{ width: '100%', padding: '4px' }}
              >
                <option value={LimitType.Unlimited}>
                  Unlimited (no restrictions)
                </option>
                <option value={LimitType.Lifetime}>
                  Lifetime (fixed total limit)
                </option>
                <option value={LimitType.Allowance}>
                  Allowance (periodic limit with reset)
                </option>
              </select>
            </Form.Item>

            {feeLimitState.limitType !== LimitType.Unlimited && (
              <Form.Item label="Limit Amount in Wei" required>
                <WeiInput
                  value={feeLimitState.limit}
                  onChange={(value) =>
                    setFeeLimitState({ ...feeLimitState, limit: value })
                  }
                  placeholder="e.g. 1000000000"
                />
              </Form.Item>
            )}

            {feeLimitState.limitType === LimitType.Allowance && (
              <Form.Item label="Limit Period in Hours" required>
                <Input
                  value={secondsToHours(feeLimitState.period)}
                  onChange={(e) =>
                    setFeeLimitState({
                      ...feeLimitState,
                      period: hoursToSeconds(e.target.value),
                    })
                  }
                  placeholder="e.g. 24 for daily"
                />
              </Form.Item>
            )}
          </Space>
        </Form.Item>

        <div style={{ marginBottom: '24px' }}>
          <Button
            type="primary"
            onClick={configureSwapPolicies}
            icon={<PlusOutlined />}
            style={{
              marginBottom: '24px',
              width: '100%',
              backgroundColor: '#52c41a',
              borderColor: '#52c41a',
              color: '#ffffff',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              const target = e.currentTarget
              target.style.backgroundColor = '#73d13d'
              target.style.borderColor = '#73d13d'
              target.style.color = '#ffffff'
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget
              target.style.backgroundColor = '#52c41a'
              target.style.borderColor = '#52c41a'
              target.style.color = '#ffffff'
            }}
          >
            🪄 Configure Swap Policies (WZKCRO ⇄ VUSD)
          </Button>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <Text strong>Transfer Policies</Text>
            <Button
              type="dashed"
              onClick={addTransferPolicy}
              icon={<PlusOutlined />}
            >
              Add Transfer Policy
            </Button>
          </div>

          {transferPolicies.map((policy, index) => (
            <Card
              key={index}
              size="small"
              style={{ marginBottom: '16px' }}
              extra={
                transferPolicies.length > 1 && (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeTransferPolicy(index)}
                  />
                )
              }
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item
                  label="Transfer Recipient Address"
                  required
                  validateStatus={
                    /^0x[a-fA-F0-9]{40}$/.test(policy.target)
                      ? 'success'
                      : 'error'
                  }
                  help={
                    !/^0x[a-fA-F0-9]{40}$/.test(policy.target) &&
                    'Invalid Ethereum address'
                  }
                >
                  <Input
                    value={policy.target}
                    onChange={(e) =>
                      updateTransferPolicy(index, 'target', e.target.value)
                    }
                    placeholder="0x..."
                  />
                </Form.Item>

                <Form.Item label="Per-Transaction Limit (Wei)" required>
                  <WeiInput
                    value={policy.maxValuePerUse}
                    onChange={(value) =>
                      updateTransferPolicy(index, 'maxValuePerUse', value)
                    }
                    placeholder="e.g. 1000000000000000"
                  />
                </Form.Item>

                <Form.Item label="Value Limit" required>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Form.Item label="Limit Type" required>
                      <select
                        value={policy.valueLimit.limitType}
                        onChange={(e) =>
                          updateTransferPolicy(
                            index,
                            'valueLimit.limitType',
                            parseInt(e.target.value)
                          )
                        }
                        style={{ width: '100%', padding: '4px' }}
                      >
                        <option value={LimitType.Unlimited}>
                          Unlimited (no restrictions)
                        </option>
                        <option value={LimitType.Lifetime}>
                          Lifetime (fixed total limit)
                        </option>
                        <option value={LimitType.Allowance}>
                          Allowance (periodic limit with reset)
                        </option>
                      </select>
                    </Form.Item>

                    {policy.valueLimit.limitType !== LimitType.Unlimited && (
                      <Form.Item label="Limit Amount in Wei" required>
                        <WeiInput
                          value={policy.valueLimit.limit}
                          onChange={(value) =>
                            updateTransferPolicy(
                              index,
                              'valueLimit.limit',
                              value
                            )
                          }
                          placeholder="e.g. 10000000000000000"
                        />
                      </Form.Item>
                    )}

                    {policy.valueLimit.limitType === LimitType.Allowance && (
                      <Form.Item label="Limit Period in Hours" required>
                        <Input
                          value={secondsToHours(policy.valueLimit.period)}
                          onChange={(e) =>
                            updateTransferPolicy(
                              index,
                              'valueLimit.period',
                              hoursToSeconds(e.target.value)
                            )
                          }
                          placeholder="e.g. 24 for daily"
                        />
                      </Form.Item>
                    )}
                  </Space>
                </Form.Item>
              </Space>
            </Card>
          ))}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <Text strong>Call Policies</Text>
            <Button
              type="dashed"
              onClick={addCallPolicy}
              icon={<PlusOutlined />}
            >
              Add Call Policy
            </Button>
          </div>

          {callPolicies.map((policy, policyIndex) => (
            <Card
              key={policyIndex}
              size="small"
              style={{ marginBottom: '16px' }}
              extra={
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeCallPolicy(policyIndex)}
                />
              }
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item
                  label="Contract Address"
                  required
                  validateStatus={
                    /^0x[a-fA-F0-9]{40}$/.test(policy.target)
                      ? 'success'
                      : 'error'
                  }
                  help={
                    !/^0x[a-fA-F0-9]{40}$/.test(policy.target) &&
                    'Invalid Ethereum address'
                  }
                >
                  <Input
                    value={policy.target}
                    onChange={(e) =>
                      updateCallPolicy(policyIndex, 'target', e.target.value)
                    }
                    placeholder="0x..."
                  />
                </Form.Item>

                <Form.Item
                  label="Function Selector"
                  required
                  validateStatus={
                    /^0x[a-fA-F0-9]{8}$/.test(policy.selector)
                      ? 'success'
                      : 'error'
                  }
                  help={
                    !/^0x[a-fA-F0-9]{8}$/.test(policy.selector) &&
                    'Invalid function selector (4 bytes)'
                  }
                >
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      value={policy.selector}
                      onChange={(e) =>
                        updateCallPolicy(
                          policyIndex,
                          'selector',
                          e.target.value
                        )
                      }
                      placeholder="0x12345678"
                    />
                    <Button
                      icon={<CalculatorOutlined />}
                      onClick={() => setModalVisible(policyIndex)}
                      style={{
                        backgroundColor: '#1890ff',
                        color: 'white',
                        borderColor: '#1890ff',
                      }}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget
                        target.style.backgroundColor = '#40a9ff'
                        target.style.borderColor = '#40a9ff'
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget
                        target.style.backgroundColor = '#1890ff'
                        target.style.borderColor = '#1890ff'
                      }}
                    >
                      Compute
                    </Button>
                  </Space.Compact>
                </Form.Item>

                <Form.Item label="Per-Call Value Limit (Wei)" required>
                  <WeiInput
                    value={policy.maxValuePerUse}
                    onChange={(value) =>
                      updateCallPolicy(policyIndex, 'maxValuePerUse', value)
                    }
                    placeholder="e.g. 1000000000000000"
                  />
                </Form.Item>

                <Form.Item label="Value Limit" required>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Form.Item label="Limit Type" required>
                      <select
                        value={policy.valueLimit.limitType}
                        onChange={(e) =>
                          updateCallPolicy(
                            policyIndex,
                            'valueLimit.limitType',
                            parseInt(e.target.value)
                          )
                        }
                        style={{ width: '100%', padding: '4px' }}
                      >
                        <option value={LimitType.Unlimited}>
                          Unlimited (no restrictions)
                        </option>
                        <option value={LimitType.Lifetime}>
                          Lifetime (fixed total limit)
                        </option>
                        <option value={LimitType.Allowance}>
                          Allowance (periodic limit with reset)
                        </option>
                      </select>
                    </Form.Item>

                    {policy.valueLimit.limitType !== LimitType.Unlimited && (
                      <Form.Item label="Limit Amount in Wei" required>
                        <WeiInput
                          value={policy.valueLimit.limit}
                          onChange={(value) =>
                            updateCallPolicy(
                              policyIndex,
                              'valueLimit.limit',
                              value
                            )
                          }
                          placeholder="e.g. 10000000000000000"
                        />
                      </Form.Item>
                    )}

                    {policy.valueLimit.limitType === LimitType.Allowance && (
                      <Form.Item label="Limit Period in Hours" required>
                        <Input
                          value={secondsToHours(policy.valueLimit.period)}
                          onChange={(e) =>
                            updateCallPolicy(
                              policyIndex,
                              'valueLimit.period',
                              hoursToSeconds(e.target.value)
                            )
                          }
                          placeholder="e.g. 24 for daily"
                        />
                      </Form.Item>
                    )}
                  </Space>
                </Form.Item>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <Text strong>Constraints</Text>
                    <Button
                      size="small"
                      type="dashed"
                      onClick={() => addConstraint(policyIndex)}
                      icon={<PlusOutlined />}
                    >
                      Add Constraint
                    </Button>
                  </div>

                  {policy.constraints.map((constraint, constraintIndex) => (
                    <Card
                      key={constraintIndex}
                      size="small"
                      style={{ marginBottom: '8px' }}
                      extra={
                        <Button
                          size="small"
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() =>
                            removeConstraint(policyIndex, constraintIndex)
                          }
                        />
                      }
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Form.Item label="Data Index" required>
                          <Input
                            value={constraint.index}
                            onChange={(e) =>
                              updateConstraint(
                                policyIndex,
                                constraintIndex,
                                'index',
                                e.target.value
                              )
                            }
                            placeholder="0"
                          />
                        </Form.Item>

                        <Form.Item label="Condition" required>
                          <select
                            value={constraint.condition}
                            onChange={(e) =>
                              updateConstraint(
                                policyIndex,
                                constraintIndex,
                                'condition',
                                parseInt(e.target.value)
                              )
                            }
                            style={{ width: '100%', padding: '4px' }}
                          >
                            <option value={0}>Unconstrained</option>
                            <option value={1}>Equal</option>
                            <option value={2}>Greater</option>
                            <option value={3}>Less</option>
                            <option value={4}>Greater Equal</option>
                            <option value={5}>Less Equal</option>
                            <option value={6}>Not Equal</option>
                          </select>
                        </Form.Item>

                        <Form.Item
                          label="Reference Value (bytes32)"
                          required
                          validateStatus={
                            /^0x[a-fA-F0-9]{64}$/.test(constraint.refValue)
                              ? 'success'
                              : 'error'
                          }
                          help={
                            !/^0x[a-fA-F0-9]{64}$/.test(constraint.refValue) &&
                            'Invalid bytes32 value'
                          }
                        >
                          <Input
                            value={constraint.refValue}
                            onChange={(e) =>
                              updateConstraint(
                                policyIndex,
                                constraintIndex,
                                'refValue',
                                e.target.value
                              )
                            }
                            placeholder="0x0000000000000000000000000000000000000000000000000000000000000000"
                          />
                        </Form.Item>

                        <Form.Item label="Limit Type" required>
                          <select
                            value={constraint.limitType}
                            onChange={(e) =>
                              updateConstraint(
                                policyIndex,
                                constraintIndex,
                                'limitType',
                                parseInt(e.target.value)
                              )
                            }
                            style={{ width: '100%', padding: '4px' }}
                          >
                            <option value={LimitType.Unlimited}>
                              Unlimited (no restrictions)
                            </option>
                            <option value={LimitType.Lifetime}>
                              Lifetime (fixed total limit)
                            </option>
                            <option value={LimitType.Allowance}>
                              Allowance (periodic limit with reset)
                            </option>
                          </select>
                          {constraint.limitType !== LimitType.Unlimited && (
                            <Text
                              type="secondary"
                              style={{ fontSize: '12px', marginTop: '4px' }}
                            >
                              No limit on constraint value
                            </Text>
                          )}
                          {constraint.limitType === LimitType.Lifetime && (
                            <Text
                              type="secondary"
                              style={{ fontSize: '12px', marginTop: '4px' }}
                            >
                              Fixed total limit for the entire session duration
                            </Text>
                          )}
                          {constraint.limitType === LimitType.Allowance && (
                            <>
                              <Text
                                type="secondary"
                                style={{ fontSize: '12px', marginTop: '4px' }}
                              >
                                Limit resets after each period
                              </Text>
                              <Form.Item label="Period" required>
                                <Input
                                  value={constraint.period}
                                  onChange={(e) =>
                                    updateConstraint(
                                      policyIndex,
                                      constraintIndex,
                                      'period',
                                      e.target.value
                                    )
                                  }
                                  placeholder="e.g. 86400 for daily"
                                />
                              </Form.Item>
                            </>
                          )}
                        </Form.Item>

                        <Form.Item label="Limit Value" required>
                          <Input
                            value={constraint.limit}
                            onChange={(e) =>
                              updateConstraint(
                                policyIndex,
                                constraintIndex,
                                'limit',
                                e.target.value
                              )
                            }
                            placeholder="0"
                          />
                        </Form.Item>
                      </Space>
                    </Card>
                  ))}
                </div>
              </Space>
            </Card>
          ))}
        </div>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            className="create-session-button"
            style={{
              width: '100%',
              backgroundColor: '#1890ff',
              borderColor: '#1890ff',
              color: '#ffffff',
              height: '40px',
              fontSize: '16px',
              fontWeight: 500,
              boxShadow: '0 2px 0 rgba(0,0,0,0.045)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              const target = e.currentTarget
              target.style.backgroundColor = '#40a9ff'
              target.style.borderColor = '#40a9ff'
              target.style.boxShadow = '0 4px 8px rgba(24,144,255,0.35)'
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget
              target.style.backgroundColor = '#1890ff'
              target.style.borderColor = '#1890ff'
              target.style.boxShadow = '0 2px 0 rgba(0,0,0,0.045)'
            }}
            disabled={
              transferPolicies.some(
                (policy) => !/^0x[a-fA-F0-9]{40}$/.test(policy.target)
              ) ||
              callPolicies.some(
                (policy) =>
                  !/^0x[a-fA-F0-9]{40}$/.test(policy.target) ||
                  !/^0x[a-fA-F0-9]{8}$/.test(policy.selector) ||
                  policy.constraints.some(
                    (c) => !/^0x[a-fA-F0-9]{64}$/.test(c.refValue)
                  )
              )
            }
          >
            Create Session
          </Button>
        </Form.Item>
      </Form>

      <FunctionSelectorModal
        visible={modalVisibleForPolicy !== null}
        onClose={() => setModalVisible(null)}
        onSelectSelector={(selector) => {
          if (modalVisibleForPolicy !== null) {
            updateCallPolicy(modalVisibleForPolicy, 'selector', selector)
            setModalVisible(null)
          }
        }}
      />

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
        {txStatus === 'pending' && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Text>Processing Transaction...</Text>
            <p>
              <Text type="secondary">
                Please wait while your transaction is being processed
              </Text>
            </p>
          </div>
        )}
        {txStatus === 'success' && (
          <div style={{ wordBreak: 'break-all' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Text strong>Transaction Successful!</Text>
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
        )}
        {txStatus === 'error' && (
          <div style={{ wordBreak: 'break-all' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Text strong>Transaction Failed</Text>
            </div>
            <p>
              <Text type="danger">{txError}</Text>
            </p>
          </div>
        )}
      </Modal>
    </Card>
  )
}
