import { zksyncSsoConnector } from "zksync-sso/connector";
import { zksyncSepoliaTestnet } from "viem/chains";
import { createConfig, connect, http } from "@wagmi/core";

interface SSOResponse {
  success: boolean;
  message: string;
}

const chain = zksyncSepoliaTestnet;

export const ssoService = {
  async createWallet(): Promise<SSOResponse> {
    try {
      const ssoConnector = zksyncSsoConnector({});
      const wagmiConfig = createConfig({
        connectors: [ssoConnector],
        chains: [chain],
        transports: {
          [chain.id]: http()
        },
      });

      const result = await connect(wagmiConfig, {
        connector: ssoConnector,
        chainId: chain.id,
      });

      console.log(result);

      return {
        success: true,
        message: "SSO wallet created successfully!"
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return {
        success: false,
        message: `Failed to create SSO wallet: ${errorMessage}`
      };
    }
  }
}; 