import { useState } from 'react';
import { Wallet } from '@crypto.com/developer-platform-client';
import {
  StyledWallet,
  StyledContainer,
  StyledWalletHeader,
  StyledWalletButton,
  StyledWalletField,
} from './styles';
import { WalletData } from '@crypto.com/developer-platform-client/dist/lib/client/interfaces/wallet.interfaces';
import { Client } from '@crypto.com/developer-platform-client';

Client.init({
  apiKey: 'SDK_API_KEY', // https://developer.crypto.com
});

export function WalletExample(): JSX.Element {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createWallet = async () => {
    try {
      setError(null);
      const response = await Wallet.create();
      if (response.status === 'Success') {
        setWallet(response.data);
      } else {
        setError('Wallet creation failed');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during wallet creation');
    }
  };

  return (
    <StyledWallet>
      <StyledContainer>
        <StyledWalletHeader>Crypto.com Wallet Example</StyledWalletHeader>
        <StyledWalletButton onClick={createWallet}>
          Create Wallet
        </StyledWalletButton>

        {error && <p style={{ color: 'red' }}>{error}</p>}
      </StyledContainer>

      {wallet && (
        <StyledContainer>
          <div>
            <label>Address</label>
            <StyledWalletField>{wallet.address}</StyledWalletField>
          </div>
          <div>
            <label>Private Key</label>
            <StyledWalletField>{wallet.privateKey}</StyledWalletField>
          </div>
          <div>
            <label>Mnemonic</label>
            <StyledWalletField>{wallet.mnemonic}</StyledWalletField>
          </div>
        </StyledContainer>
      )}
    </StyledWallet>
  );
}
