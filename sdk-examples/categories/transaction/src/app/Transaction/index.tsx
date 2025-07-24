import { Client, Transaction } from "@crypto.com/developer-platform-client";
import { useState } from "react";
import {
  StyledContainer,
  StyledError,
  StyledInput,
  StyledLabel,
  StyledLoading,
  StyledSection,
  StyledSuccess,
  StyledTransaction,
  StyledTransactionButton,
  StyledTransactionHeader,
} from "./styles";

Client.init({
  apiKey: "SDK_API_KEY", // https://developer.crypto.com
});

interface ApiResult {
  success: boolean;
  data?: any;
  error?: string;
}

export function TransactionExample(): JSX.Element {
  const [results, setResults] = useState<Record<string, ApiResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [txHash, setTxHash] = useState<string>("");

  const executeFunction = async (
    functionName: string,
    apiCall: () => Promise<any>,
  ) => {
    setLoading((prev) => ({ ...prev, [functionName]: true }));
    try {
      const response = await apiCall();
      if (response.status === "Success") {
        setResults((prev) => ({
          ...prev,
          [functionName]: { success: true, data: response.data },
        }));
      } else {
        setResults((prev) => ({
          ...prev,
          [functionName]: {
            success: false,
            error: response.message || "API call failed",
          },
        }));
      }
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [functionName]: {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [functionName]: false }));
    }
  };

  const getTransactionByHash = async () => {
    if (!txHash) {
      setResults((prev) => ({
        ...prev,
        getTransactionByHash: {
          success: false,
          error: "Please enter transaction hash",
        },
      }));
      return;
    }
    executeFunction("getTransactionByHash", () =>
      Transaction.getTransactionByHash(txHash),
    );
  };

  const getTransactionStatus = async () => {
    if (!txHash) {
      setResults((prev) => ({
        ...prev,
        getTransactionStatus: {
          success: false,
          error: "Please enter transaction hash",
        },
      }));
      return;
    }
    executeFunction("getTransactionStatus", () =>
      Transaction.getTransactionStatus(txHash),
    );
  };

  const renderResult = (functionName: string) => {
    const result = results[functionName];
    const isLoading = loading[functionName];

    if (isLoading) {
      return <StyledLoading>Loading...</StyledLoading>;
    }

    if (!result) return null;

    if (result.success) {
      return (
        <StyledSuccess>{JSON.stringify(result.data, null, 2)}</StyledSuccess>
      );
    } else {
      return <StyledError>Error: {result.error}</StyledError>;
    }
  };

  return (
    <StyledTransaction>
      <StyledContainer>
        <StyledTransactionHeader>
          Crypto.com Transaction Example
        </StyledTransactionHeader>

        <StyledSection>
          <div>
            <StyledLabel>Transaction Hash:</StyledLabel>
            <StyledInput
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="0x..."
            />
          </div>
        </StyledSection>

        <StyledSection>
          <StyledTransactionButton onClick={getTransactionByHash}>
            Get Transaction by Hash
          </StyledTransactionButton>
          {renderResult("getTransactionByHash")}
        </StyledSection>

        <StyledSection>
          <StyledTransactionButton onClick={getTransactionStatus}>
            Get Transaction Status
          </StyledTransactionButton>
          {renderResult("getTransactionStatus")}
        </StyledSection>
      </StyledContainer>
    </StyledTransaction>
  );
}
