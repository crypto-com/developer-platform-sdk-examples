import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, message, Typography } from 'antd'
import { useSSOStore } from '../services/useSSOStore'
import { showError } from '../AppUtils'

const { Text } = Typography

export function WalletSetup() {
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
                      onClick={copyAddress}
                      title="Copy address"
                      className="ml-2"
                    >
                      Copy
                    </Button>
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
