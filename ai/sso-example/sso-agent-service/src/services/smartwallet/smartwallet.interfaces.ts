export type TxStatus =
  | {
      type: TxStatusType.NewTxDetected;
      data: {
        txHash: string;
        tokenName: string;
        tokenAmount: string;
      };
    }
  | {
      type: TxStatusType.TxCompleted;
      data: {
        txHash: string;
      };
    };

export enum TxStatusType {
  NewTxDetected = 'newTxDetected',
  TxCompleted = 'txCompleted',
}
