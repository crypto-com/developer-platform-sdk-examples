import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom'
import { Button } from 'antd'
import { useSSOStore } from '../services/useSSOStore'
import { WalletSetup } from './WalletSetup'
import { WalletDashboard } from './WalletDashboard'
import { TransferToken } from './TransferToken'
import { AgentPage } from './AgentPage'

export function AppContent() {
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
