import { message } from 'antd'

// Utility function for showing error messages
export const showError = (err: unknown) => {
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

// Utility function for getting transaction explorer link
export const getTxExplorerLink = (hash: string) => {
  return `https://explorer.zkevm.cronos.org/testnet/tx/${hash}`
}

// Utility function for formatting transaction hash
export const formatTxHash = (hash: string) => {
  if (!hash) return ''
  return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`
}

// Utility function for formatting date
export const formatDate = (date: Date) => {
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
}

// Utility function for checking if session is expired
export const isSessionExpired = (session: any) => {
  const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
  return currentTimestamp >= session.session.expiresAt
}
