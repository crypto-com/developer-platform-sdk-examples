import { Contract, ethers, parseUnits } from 'ethers';
import { FunctionCallResponse, Status } from '../agent/agent.interfaces.js';

/**
 * TokenService class handles token operations.
 *
 * @class TokenService
 */
export default class TokenService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet | null = null;

  /**
   * @param {string} rpcUrl - rpc value of the chain.
   * @param {string} privateKey - Wallet private key - It is risky and unsafe to have private key in cleartext in the machine.
   */
  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Transfers tokens to a specified address using the previously initialized signer.
   *
   * @async
   * @param to - Recipient address.
   * @param amount - Amount to transfer.
   * @param contractAddress - Address of the token contract.
   * @returns {Promise<FunctionCallResponse>} - Response with transaction details or error.
   * @memberof TokenService
   */
  public async transfer(to: string, amount: string, contractAddress?: string): Promise<FunctionCallResponse> {
    if (!this.signer) {
      return {
        status: Status.Failed,
        data: {
          message: 'Signer not initialized. Please call initializeSigner first.',
        },
      };
    }

    try {
      let tx;

      if (contractAddress) {
        const tokenContract = new Contract(
          contractAddress,
          ['function transfer(address to, uint256 amount) public returns (bool)'],
          this.signer
        );

        tx = await tokenContract.transfer(to, parseUnits(amount, 18));
      } else {
        tx = await this.signer.sendTransaction({
          to,
          value: parseUnits(amount, 'ether'),
        });
      }

      const receipt = await tx.wait();
      return {
        status: Status.Success,
        data: {
          transactionHash: receipt.hash,
          message: 'Transfer successful',
        },
      };
    } catch (e) {
      return {
        status: Status.Failed,
        data: {
          message: `Error in transferToken: ${e}`,
        },
      };
    }
  }
}
