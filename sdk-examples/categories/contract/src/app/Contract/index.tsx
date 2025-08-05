import { Client, Contract } from "@crypto.com/developer-platform-client";
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

Client.init({
  apiKey: "SDK_API_KEY", // https://developer.crypto.com
});

interface ApiResult {
  success: boolean;
  data?: any;
  error?: string;
}

export function ContractExample(): JSX.Element {
  const [results, setResults] = useState<Record<string, ApiResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [formState, setFormState] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

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

  const getContractCode = async () => {
    if (!formState.contractAddress) {
      setResults((prev) => ({
        ...prev,
        getContractCode: {
          success: false,
          error: "Please enter contract address",
        },
      }));
      return;
    }
    executeFunction("getContractCode", () =>
      Contract.getContractCode(formState.contractAddress),
    );
  };

    const getContractABI = async () => {
    if (!formState.contractAddress && !formState.explorerKey) {
      setResults((prev) => ({
        ...prev,
        getContractABI: {
          success: false,
          error: "Please enter contract address and explorerKey",
        },
      }));
      return;
    }
    executeFunction("getContractABI", () =>
      Contract.getContractABI(formState.contractAddress, formState.explorerKey),
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
          Crypto.com Contract Example
        </StyledTransactionHeader>

        <StyledSection>
          <StyledHeading>Contract</StyledHeading>
          <StyledLabel>Contract Address:</StyledLabel>
          <StyledInput
            name="contractAddress"
            type="text"
            value={formState.contractAddress}
            onChange={handleInputChange}
            placeholder="0x..."
          />
          <StyledLabel>Explorer Key:</StyledLabel>
          <StyledInput
            name="explorerKey"
            type="text"
            value={formState.explorerKey}
            onChange={handleInputChange}
            placeholder="explorer key"
          />
          <StyledTransactionButton onClick={getContractABI}>
            Get Contract ABI
          </StyledTransactionButton>
          {renderResult("getContractABI")}
          <StyledTransactionButton onClick={getContractCode}>
            Get Contract Code
          </StyledTransactionButton>
          {renderResult("getContractCode")}
        </StyledSection>
      </StyledContainer>
    </StyledTransaction>
  );
}
