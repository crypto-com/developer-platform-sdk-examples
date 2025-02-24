import { createConfig } from '@wagmi/core'
import { Address, defineChain, http } from 'viem'
import { chainConfig } from 'viem/zksync'
import { PasskeyRequiredContracts } from 'zksync-sso/client/passkey'

export const CHAIN = defineChain({
  ...chainConfig,
  id: 240,
  name: 'Cronos zkEVM Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Cronos zkEVM Test Coin',
    symbol: 'zkTCRO',
  },
  rpcUrls: {
    default: { http: ['https://seed.testnet.zkevm.cronos.org/'] },
  },
  blockExplorers: {
    default: {
      name: 'Cronos zkEVM Testnet Explorer',
      url: 'https://explorer.zkevm.cronos.org/testnet/',
    },
    native: {
      name: 'Cronos zkEVM Testnet Explorer',
      url: 'https://explorer.zkevm.cronos.org/testnet/',
    },
  },
  testnet: true,
})

export const WagmiConfig = createConfig({
  chains: [CHAIN],
  transports: { [CHAIN.id]: http() },
})

type ChainContracts = PasskeyRequiredContracts & {
  accountFactory: NonNullable<PasskeyRequiredContracts['accountFactory']>
  accountPaymaster: Address
}

export const CONTRACTS: ChainContracts = {
  session: '0xfebC82bBFC6FB8666AC45fa8a601DfA34Ce30710',
  passkey: '0x0A019BD60E42b9d18413C710992B96E69dFFC5A0',
  accountFactory: '0x381539B4FC39eAe0Eb848f52cCA93F168a0e955D',
  accountPaymaster: '0xA7B450E91Bc126aa93C656750f9c940bfdc2f1e9',
}
