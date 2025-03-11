import { useState, useEffect } from 'react'
import { useSSOStore } from '../services/useSSOStore'
import { isSessionExpired } from '../AppUtils'

export function useSessionManagement() {
  const { sessionConfig, setSessionConfig, sessions, fetchAllSessions } =
    useSSOStore()
  const [shouldRestoreSession] = useState(() => {
    return localStorage.getItem('sso.sessionDeselected') !== 'true'
  })

  useEffect(() => {
    const restoreSession = async () => {
      if (!sessionConfig && shouldRestoreSession) {
        const sessionKey = localStorage.getItem('sso.sessionKey')
        if (sessionKey) {
          await fetchAllSessions()

          const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
          const activeSession = sessions.find(
            (s) =>
              !isSessionExpired(s) &&
              BigInt(s.session.expiresAt) > currentTimestamp
          )

          if (activeSession) {
            setSessionConfig(activeSession.session)
          } else {
            setSessionConfig(null)
          }
        }
      }
    }
    restoreSession()
  }, [
    sessionConfig,
    sessions,
    shouldRestoreSession,
    fetchAllSessions,
    setSessionConfig,
  ])

  const handleSessionSelect = async (session: any) => {
    if (sessionConfig && session.signer === sessionConfig.signer) {
      setSessionConfig(null)
      localStorage.removeItem('sso.sessionKey')
      localStorage.setItem('sso.sessionDeselected', 'true')
      return true
    }

    const sessionKey = localStorage.getItem(`sso.sessionKey.${session.signer}`)

    if (sessionKey) {
      localStorage.setItem('sso.sessionKey', sessionKey)
      localStorage.removeItem('sso.sessionDeselected')
      setSessionConfig(session)
      return true
    }

    return false
  }

  return {
    sessionConfig,
    handleSessionSelect,
    shouldRestoreSession,
  }
}
