import { useState, useEffect, useRef } from 'react'
import { Card, Button, Typography, Form, Input, message, Space } from 'antd'
import { useSSOStore } from '../services/useSSOStore'
import { useSessionManagement } from '../hooks/useSessionManagement'
import { showError, formatTxHash, formatDate } from '../AppUtils'
import { NULL_ADDRESS } from '../services/constants'

const { Text, Title } = Typography

interface Transaction {
  txHash: string
  timestamp: Date
  amount: string
  receiver: string
}

export function AgentPage() {
  const { sendTransaction } = useSSOStore()
  const { sessionConfig } = useSessionManagement()
  const [receiver, setReceiver] = useState<string>(NULL_ADDRESS)
  const [amount, setAmount] = useState<string>('1') // Default to 1 wei
  const [intervalTime, setIntervalTime] = useState<number>(60) // Default 1 minute
  const [remainingTime, setRemainingTime] = useState<number>(0)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [status, setStatus] = useState<string>('')
  const [txHistory, setTxHistory] = useState<Transaction[]>([])

  const timerRef = useRef<number | null>(null)
  const countdownRef = useRef<number | null>(null)

  const hasActiveSession = sessionConfig !== null

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
      if (countdownRef.current !== null)
        window.clearInterval(countdownRef.current)
    }
  }, [])

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

    countdownRef.current = window.setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          return intervalTime
        }
        return prev - 1
      })
    }, 1000)

    sendAgentTransaction()
    timerRef.current = window.setInterval(() => {
      sendAgentTransaction()
    }, intervalTime * 1000)
  }

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

  const sendAgentTransaction = async () => {
    if (!sessionConfig) return

    try {
      const bigintAmount = BigInt(amount)
      const txHash = await sendTransaction(
        receiver as `0x${string}`,
        bigintAmount
      )

      const now = new Date()
      const formattedTimestamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
      const statusMessage = `Transaction sent at ${formattedTimestamp}!`

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
      stopAgent()
    }
  }

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
