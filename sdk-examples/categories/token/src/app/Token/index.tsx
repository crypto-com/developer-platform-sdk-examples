import { Client, Token } from "@crypto.com/developer-platform-client";
import { useState } from "react";
import {
  StyledContainer,
  StyledError,
  StyledHeading,
  StyledInput,
  StyledLabel,
  StyledLoading,
  StyledSection,
  StyledSuccess,
  StyledTransaction,
  StyledTransactionButton,
  StyledTransactionHeader,
} from "./styles";
import {
  ApiResponse,
  Status,
} from "@crypto.com/developer-platform-client/dist/integrations/api.interfaces";
import {
  Balance,
  TokenMetadata,
} from "@crypto.com/developer-platform-client/dist/lib/client/interfaces/token.interfaces";

Client.init({
  apiKey: "SDK_API_KEY", // https://developer.crypto.com
});

type ResultMap = {
  getNativeTokenBalance: ApiResponse<Balance>;
  getERC20TokenBalance: ApiResponse<Balance>;
  getERC721TokenBalance: ApiResponse<Balance>;
  getERC20Metadata: ApiResponse<TokenMetadata>;
  getERC721Metadata: ApiResponse<TokenMetadata>;
  getTokenOwner: ApiResponse<string>;
  getTokenUri: ApiResponse<string>;
};

export function TokenExample(): JSX.Element {
  const [results, setResults] = useState<Partial<ResultMap>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [formState, setFormState] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const executeFunction = async <T extends keyof ResultMap>(
    functionName: T,
    apiCall: () => Promise<ResultMap[T]>,
  ) => {
    setLoading((prev) => ({ ...prev, [functionName]: true }));
    try {
      const response = await apiCall();
      setResults((prev) => ({ ...prev, [functionName]: response }));
    } catch (error) {
      const fallback: ResultMap[T] = {
        status: Status.Failed,
        data: null as any,
      } as ResultMap[T];
      setResults((prev) => ({ ...prev, [functionName]: fallback }));
    } finally {
      setLoading((prev) => ({ ...prev, [functionName]: false }));
    }
  };

  const getNativeTokenBalance = () =>
    executeFunction("getNativeTokenBalance", () =>
      Token.getNativeTokenBalance(formState.nativeWallet),
    );

  const getERC20TokenBalance = () =>
    executeFunction("getERC20TokenBalance", () =>
      Token.getERC20TokenBalance(
        formState.erc20Wallet,
        formState.erc20Contract,
      ),
    );

  const getERC721TokenBalance = () =>
    executeFunction("getERC721TokenBalance", () =>
      Token.getERC721TokenBalance(
        formState.erc721Wallet,
        formState.erc721Contract,
      ),
    );

  const getERC20Metadata = () =>
    executeFunction("getERC20Metadata", () =>
      Token.getERC20Metadata(formState.erc20Contract),
    );

  const getERC721Metadata = () =>
    executeFunction("getERC721Metadata", () =>
      Token.getERC721Metadata(formState.erc721Contract),
    );

  const getTokenOwner = () =>
    executeFunction("getTokenOwner", () =>
      Token.getTokenOwner(formState.erc721Contract, formState.erc721TokenId),
    );

  const getTokenUri = () =>
    executeFunction("getTokenUri", () =>
      Token.getTokenURI(formState.erc721Contract, formState.erc721TokenId),
    );

  const renderResult = (functionName: keyof ResultMap) => {
    const result = results[functionName];
    const isLoading = loading[functionName];

    if (isLoading) {
      return <StyledLoading>Loading...</StyledLoading>;
    }

    if (!result) {
      return null;
    }

    if (result.status === Status.Success) {
      return (
        <StyledSuccess>{JSON.stringify(result.data, null, 2)}</StyledSuccess>
      );
    }

    return (
      <StyledError>Error: {(result as any).message || "Failed"}</StyledError>
    );
  };

  return (
    <StyledTransaction>
      <StyledContainer>
        <StyledTransactionHeader>
          Crypto.com Token Example
        </StyledTransactionHeader>

        {/* Native Balance Section */}
        <StyledSection>
          <StyledHeading>Native Balance</StyledHeading>
          <StyledLabel>Wallet Address</StyledLabel>
          <StyledInput
            name="nativeWallet"
            value={formState.nativeWallet}
            onChange={handleInputChange}
            placeholder="0x... or yourname.cro"
          />
          <StyledTransactionButton onClick={getNativeTokenBalance}>
            Get Native Token Balance
          </StyledTransactionButton>
          {renderResult("getNativeTokenBalance")}
        </StyledSection>

        {/* ERC20 Token Section */}
        <StyledSection>
          <StyledHeading>ERC20 Token</StyledHeading>
          <StyledLabel>Wallet Address</StyledLabel>
          <StyledInput
            name="erc20Wallet"
            value={formState.erc20Wallet}
            onChange={handleInputChange}
            placeholder="0x..."
          />
          <StyledLabel>Contract Address</StyledLabel>
          <StyledInput
            name="erc20Contract"
            value={formState.erc20Contract}
            onChange={handleInputChange}
            placeholder="0x..."
          />

          <StyledTransactionButton onClick={getERC20TokenBalance}>
            Get ERC20 Token Balance
          </StyledTransactionButton>
          {renderResult("getERC20TokenBalance")}

          <StyledTransactionButton onClick={getERC20Metadata}>
            Get ERC20 Metadata
          </StyledTransactionButton>
          {renderResult("getERC20Metadata")}
        </StyledSection>

        {/* ERC721 Token Section */}
        <StyledSection>
          <StyledHeading>ERC721 Token</StyledHeading>
          <StyledLabel>Wallet Address</StyledLabel>
          <StyledInput
            name="erc721Wallet"
            value={formState.erc721Wallet}
            onChange={handleInputChange}
            placeholder="0x..."
          />
          <StyledLabel>Contract Address</StyledLabel>
          <StyledInput
            name="erc721Contract"
            value={formState.erc721Contract}
            onChange={handleInputChange}
            placeholder="0x..."
          />
          <StyledLabel>Token ID</StyledLabel>
          <StyledInput
            name="erc721TokenId"
            value={formState.erc721TokenId}
            onChange={handleInputChange}
            placeholder="Token ID (e.g. 123)"
          />

          <StyledTransactionButton onClick={getERC721TokenBalance}>
            Get ERC721 Token Balance
          </StyledTransactionButton>
          {renderResult("getERC721TokenBalance")}

          <StyledTransactionButton onClick={getERC721Metadata}>
            Get ERC721 Metadata
          </StyledTransactionButton>
          {renderResult("getERC721Metadata")}

          <StyledTransactionButton onClick={getTokenOwner}>
            Get Token Owner
          </StyledTransactionButton>
          {renderResult("getTokenOwner")}

          <StyledTransactionButton onClick={getTokenUri}>
            Get Token URI
          </StyledTransactionButton>
          {renderResult("getTokenUri")}
        </StyledSection>
      </StyledContainer>
    </StyledTransaction>
  );
}
