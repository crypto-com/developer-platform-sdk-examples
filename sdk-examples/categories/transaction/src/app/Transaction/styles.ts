import { styled } from "styled-components";

export const StyledTransaction = styled.div`
  margin: 100px auto;
  width: 500px;
  display: grid;
  gap: 20px;
`;

export const StyledContainer = styled.div`
  padding: 24px;
  background-color: #131314;
  border: 1px solid #3e3e3e;
  border-radius: 20px;
  color: #f1f1f1;
  font-family: sans-serif;
`;

export const StyledTransactionHeader = styled.h2`
  text-align: center;
  margin-bottom: 24px;
  font-size: 24px;
  color: #ffffff;
`;

export const StyledTransactionButton = styled.button`
  width: 100%;
  background-color: #0061a8;
  color: white;
  padding: 12px;
  font-size: 18px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  margin-bottom: 24px;

  &:hover {
    background-color: #007bd1;
  }
`;

export const StyledInput = styled.input`
  background-color: #2c2c2e;
  border: none;
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0 20px;
  font-size: 14px;
  color: #eaeaea;
  font-family: "Courier New", monospace;
  overflow-x: auto;
  word-break: break-word;
  width: 100%;
  box-sizing: border-box;

  &::placeholder {
    color: #888;
  }

  &:focus {
    outline: none;
  }

  scrollbar-width: thin;
  scrollbar-color: #555 transparent;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
`;

export const StyledLabel = styled.label`
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 5px;
  display: block;
`;

export const StyledSection = styled.div``;

export const StyledSuccess = styled.div`
  background-color: #2c2c2e;
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0 20px;
  font-size: 14px;
  color: #eaeaea;
  font-family: "Courier New", monospace;
  overflow-x: auto;
  word-break: break-word;
  white-space: pre-wrap;
  text-align: left;

  scrollbar-width: thin;
  scrollbar-color: #555 transparent;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
`;

export const StyledError = styled.div`
  background-color: #2c2c2e;
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0 20px;
  font-size: 14px;
  color: #ff6b6b;
  font-family: "Courier New", monospace;
  overflow-x: auto;
  word-break: break-word;

  scrollbar-width: thin;
  scrollbar-color: #555 transparent;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
`;

export const StyledLoading = styled.div`
  color: #0061a8;
  font-size: 14px;
  text-align: center;
  padding: 20px;
`;
