import { ethers, parseEther } from 'ethers';
import { logger, sanitizeError } from '../../helpers/logger.helper.js';
import { FunctionCallResponse, Status } from '../agent/agent.interfaces.js';
import { HTTP_ENDPOINT, TARGET_ADDRESS, WBTC_ADDRESS, WS_ENDPOINT } from '../../helpers/constants/global.constants.js';
import { Provider, Wallet } from 'zksync-ethers';
import { TxStatus, TxStatusType } from './smartwallet.interfaces.js';

/**
 * SmartWalletService class handles requests to provider or explorer API.
 *
 * @class SmartWalletService
 */
export class SmartWalletService {
  private static privateKey: string = '';
  private static status: TxStatus[] = [];

  /**
   * Generates a new wallet, stores the private key, and returns the wallet details.
   *
   * @async
   * @returns {Promise<FunctionCallResponse>} - A response object containing the wallet address and a success message.
   * @memberof SmartWalletService
   */
  public async accountRequest(): Promise<FunctionCallResponse> {
    try {
      const wallet = ethers.Wallet.createRandom();
      SmartWalletService.privateKey = wallet.privateKey;

      return {
        status: Status.Success,
        data: {
          address: wallet.address,
          message: `I will copy trade from now on the transaction from the top accounts. I have generated a wallet: ${wallet.address}. Please authorize this wallet to send transactions from your account.`,
        },
      };
    } catch (e) {
      logger.error('[WalletService/authorizeWallet] authorizeWallet error: ', e);
      return {
        status: Status.Failed,
        data: {
          message: `Error while creating wallet ${e}`,
        },
      };
    }
  }

  /**
   * Retrieves the current transaction status and clears the status log.
   *
   * @returns {FunctionCallResponse} - A response object containing the transaction status.
   * @memberof SmartWalletService
   */
  public getTransaction(): FunctionCallResponse {
    const txStatus = SmartWalletService.status;
    SmartWalletService.status = [];

    return {
      status: Status.Success,
      data: {
        txStatus: txStatus,
      },
    };
  }

  /**
   * Initiates the copy-trading process for the specified wallet address.
   *
   * @param {string} from - The wallet address to use for copying transactions.
   * @returns {FunctionCallResponse} - A response object with a success message.
   * @memberof SmartWalletService
   */
  public initCopyTrade(from: string): FunctionCallResponse {
    this.eventListener(from);
    return {
      status: Status.Success,
      data: {
        message: `Starting to copy top accounts for address ${from}`,
      },
    };
  }

  /**
   * Listens for blockchain events and processes relevant transactions.
   *
   * @async
   * @param {string} from - The wallet address to use for copying transactions.
   * @returns {Promise<void>} - A Promise that resolves when the event listener is set up.
   * @memberof SmartWalletService
   */
  public async eventListener(from: string): Promise<void> {
    try {
      const jsonRpcProvider = new ethers.JsonRpcProvider(HTTP_ENDPOINT);
      const provider = new ethers.WebSocketProvider(WS_ENDPOINT);

      logger.info('Connected to provider');

      provider.on('block', async (blockNumber) => {
        logger.info(`Received block ${blockNumber}`);
        const block = await jsonRpcProvider.getBlock(blockNumber, true);

        if (!block) {
          return;
        }

        const relevantTxs = block.prefetchedTransactions.filter((tx) => tx.from?.toLowerCase() === TARGET_ADDRESS);
        logger.info(`Found ${relevantTxs.length} transactions for address ${TARGET_ADDRESS} in block ${block.number}`);

        if (relevantTxs.length < 1) {
          return;
        }
        const txToCopy = relevantTxs[0];

        logger.info(JSON.stringify(txToCopy, null, 2));

        SmartWalletService.status.push({
          type: TxStatusType.NewTxDetected,
          data: {
            txHash: txToCopy.hash,
            tokenName: 'WBTC',
            tokenAmount: '0.01',
          },
        });

        const provider = new Provider(HTTP_ENDPOINT);
        const wallet = new Wallet(SmartWalletService.privateKey, provider);

        const nonce = await provider.getTransactionCount(from);

        const response = await wallet.sendTransaction({
          nonce: nonce,
          to: WBTC_ADDRESS,
          value: parseEther('0.01'),
          from: from,
          data: '0x8119c065',
        });

        logger.info('Tx sent: ', response);

        SmartWalletService.status.push({
          type: TxStatusType.TxCompleted,
          data: {
            txHash: response.hash,
          },
        });
      });
    } catch (e) {
      logger.error(`Error in event listener setup: ${sanitizeError(e)}`);
      throw e;
    }
  }
}
