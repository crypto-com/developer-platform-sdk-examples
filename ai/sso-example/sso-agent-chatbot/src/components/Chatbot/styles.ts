import { styled } from "styled-components";
import { Message } from "./interfaces";
import { Button, Input } from "antd";
import { format } from "date-fns";

export const StyledMessageContainer = styled.div<{ message: Message }>`
  margin-bottom: 15px;
  width: ${(props) => (props.message.type === "user" ? "60%" : "100%")};
  margin-left: auto;
`;

export const StyledChatBotContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 90%;
  max-width: 800px;
  margin: 0 auto;
  overflow: hidden;
`;

export const StyledChatArea = styled.div`
  width: 100%;
  flex-grow: 1;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

export const StyledMessageLabel = styled.div`
  font-size: 0.5em;
  font-weight: bold;
  color: #666;
  text-transform: uppercase;
  margin-bottom: 4px;
`;

export const StyledMessageComponent = styled.div<{ message: Message }>`
  border-radius: 8px;
  background-color: ${(props) =>
    props.message.type === "user"
      ? "#57bfe8"
      : props.message.isJson
        ? "#333"
        : "#f4f4f4"};
  color: ${(props) =>
    props.message.isJson || props.message.type === "user" ? "#fff" : "#000"};
  font-family: ${(props) => (props.message.isJson ? "monospace" : "inherit")};
  display: flex;
  flex-direction: column;
  position: relative;

  &:after {
    content: "${(props) => format(new Date(props.message.timestamp), "p")}";
    position: absolute;
    top: 5px;
    right: 15px;
    font-size: 0.75em;
    color: ${(props) => (props.message.type === "user" ? "#fff" : "grey")};
    display:  ${(props) => props.message.isJson && "none"}; 
  }
};
`;

export const StyledMessageContent = styled.div<{ isJson?: boolean }>`
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ${props => props.isJson ? 'monospace' : 'inherit'};
`;

export const StyledJsonMessageHeader = styled.div`
  border-radius: 8px 8px 0 0;
  padding: 2px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #444;
  font-size: 0.8em;
`;

export const StyledCopyButton = styled.button`
  display: flex;
  align-items: center;
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 0.8em;
  padding-right: 10px;

  svg {
    margin-left: 5px;
    fill: #fff;
    width: 16px;
    height: 16px;
  }
`;

export const StyledTypingIndicator = styled.div`
  width: 20px;
  height: 15px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 5px;

  div {
    width: 4px;
    height: 4px;
    background-color: #000;
    border-radius: 50%;
    opacity: 0;
    animation: bounce 1.2s infinite;

    &:nth-child(1) {
      animation-delay: 0s;
    }
    &:nth-child(2) {
      animation-delay: 0.4s;
    }
    &:nth-child(3) {
      animation-delay: 0.8s;
    }
  }

  @keyframes bounce {
    0%,
    80%,
    100% {
      transform: translateY(0);
      opacity: 0;
    }
    40% {
      opacity: 1;
    }
  }
`;

export const StyledInputContainer = styled.div`
  height: 60px;
  display: flex;
  align-items: center;
  background: #f4f4f4;
  border-radius: 25px;
  padding: 15px 20px;
  gap: 1.5rem;
  position: relative;
  overflow: hidden;
`;

export const StyledDisclaimer = styled.div`
  font-size: 12px;
  text-align: center;
  margin: 20px 0;
  color: grey;
`;

export const StyledTextArea = styled(Input.TextArea)`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  border-radius: 26px;
  padding-right: 3rem;
  overflow: auto;

  &:hover,
  &:focus {
    background: transparent;
    outline: none;
    box-shadow: none;
  }

  &::-webkit-scrollbar {
    display: none;
  }
`;

export const StyledSendButton = styled(Button)`
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  background: #000;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover,
  &:focus {
    background: #000000b0 !important;
    color: #fff !important;
  }
`;

export const StyledAttachmentButton = styled(Button)`
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
`;

export const StyledDateLabelContainer = styled.div`
  text-align: center;
  margin-bottom: 60px;
  margin-top: 20px;
`;

export const StyledDateLabel = styled.span`
  padding: 10px 20px;
  color: #666;
  font-size: 0.9em;
  font-weight: bold;
  background-color: #f4f4f4;
  margin: 20px;
  width: auto;
  border-radius: 26px;
`;
