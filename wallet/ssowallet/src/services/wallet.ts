import { ethers, BrowserProvider, JsonRpcSigner } from 'ethers'

class WalletService {
  private provider: BrowserProvider | null = null
  private signer: JsonRpcSigner | null = null

  async connect(): Promise<string> {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('Please install MetaMask')
    }

    this.provider = new BrowserProvider(window.ethereum)
    await this.provider.send('eth_requestAccounts', [])
    this.signer = await this.provider.getSigner()

    const address = await this.signer.getAddress()
    return address
  }

  async getBalance(address: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized')
    }

    const balance = await this.provider.getBalance(address)
    return ethers.formatEther(balance)
  }

  async sendTransaction(to: string, amount: string): Promise<any> {
    if (!this.signer) {
      throw new Error('Wallet not connected')
    }

    const tx = await this.signer.sendTransaction({
      to,
      value: ethers.parseEther(amount),
    })

    return tx
  }
}

export const walletService = new WalletService()
