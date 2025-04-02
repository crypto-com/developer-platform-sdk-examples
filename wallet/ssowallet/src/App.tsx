import { useState, useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { useSSOStore } from './services/useSSOStore'
import { AppContent } from './components/AppContent'

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
          if (
            error instanceof Error &&
            (error.message.includes('authentication') ||
              error.message.includes('account not found') ||
              error.message.includes('Invalid credential'))
          ) {
            localStorage.setItem('sso.logined', 'false')
          }
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
