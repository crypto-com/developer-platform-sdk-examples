import { useState } from "react";
import { ArrowUpOutlined } from "@ant-design/icons";
import { chainAiInstance } from "../../integration/chain-ai.api";
import {
  StyledChatArea,
  StyledMessageContainer,
  StyledMessageComponent,
  StyledChatBotContainer,
  StyledInputContainer,
  StyledTextArea,
  StyledSendButton,
  StyledDateLabel,
  StyledDateLabelContainer,
  StyledDisclaimer,
} from "./styles";
import { InputType, Message } from "./interfaces";
import { MessageLabel } from "./MessageLabel";
import { MessageContent } from "./MessageContent";
import { JsonMessage } from "./JsonMessage";
import {
  ChainAiApiResponse,
  ChainAiApiResponseError,
} from "../../integration/chain-ai.interface";
import { getChatStartDate } from "../../helpers/chat.helpers";
import { Alert, Button } from "antd";

export function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [context, setContext] = useState<Array<{ role: string; content: string }>>([]);

  const chatStartDate = getChatStartDate(messages);

  const addMessage = (
    text: string,
    type: InputType,
    isLoading: boolean,
    isJson: boolean = false,
    isMagicLink: boolean = false
  ): void => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { text, type, isLoading, isJson, isMagicLink, timestamp: new Date() },
    ]);
  };

  const updateBotResponse = (response: ChainAiApiResponse): void => {
    setMessages((prevMessages) => {
      const newMessages = [...prevMessages];
      const lastBotIdx = newMessages.findIndex(
        (msg) => msg.isLoading && msg.type === InputType.Bot
      );

      if (lastBotIdx !== -1) {
        const result = response.results[0]?.data;
        if (result) {
          if ('magicLink' in result) {
            newMessages[lastBotIdx] = {
              text: result.magicLink as string,
              type: InputType.Bot,
              isJson: false,
              isLoading: false,
              timestamp: new Date(),
              isMagicLink: true,
            };
          } else {
            newMessages[lastBotIdx] = {
              text: JSON.stringify(result, null, 2),
              type: InputType.Bot,
              isJson: true,
              isLoading: false,
              timestamp: new Date(),
            };
          }

          if (response.results[0]?.status) {
            newMessages.push({
              text: response.results[0].status,
              type: InputType.Bot,
              isJson: false,
              isLoading: false,
              timestamp: new Date(),
            });
          }

          if (response.finalResponse) {
            newMessages.push({
              text: response.finalResponse,
              type: InputType.Bot,
              isJson: false,
              isLoading: false,
              timestamp: new Date(),
            });
          }
        } else {
          newMessages[lastBotIdx] = {
            ...newMessages[lastBotIdx],
            text: response.finalResponse || response.status || "Unknown status",
            isLoading: false,
          };
        }
      }
      return newMessages;
    });

    if (response.context) {
      setContext(prevContext => {
        const newContext = [...prevContext, ...response.context];
        return newContext.length > 10 ? newContext.slice(-10) : newContext;
      });
    }
  };

  const handleError = (error: ChainAiApiResponseError): void => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.isLoading && msg.type === InputType.Bot
          ? {
              ...msg,
              text: error.response.data.error,
              isLoading: false,
            }
          : msg
      )
    );
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    const userInput = input.trim();
    if (!userInput) return;

    addMessage(userInput, InputType.User, false);
    addMessage("Typing...", InputType.Bot, true);
    setInput("");

    try {
      const response = await chainAiInstance.sendQuery(userInput, context);
      console.log(response);
      updateBotResponse(response);
    } catch (e) {
      const error = e as ChainAiApiResponseError;
      console.error("Failed to send query:", e);
      handleError(error);
    }
  };

  return (
    <StyledChatBotContainer>
      <StyledChatArea>
        <StyledDateLabelContainer>
          {chatStartDate && <StyledDateLabel>{chatStartDate}</StyledDateLabel>}
        </StyledDateLabelContainer>
        {messages.map((msg, index) => (
          <StyledMessageContainer key={index} message={msg}>
            <MessageLabel type={msg.type} isJson={msg.isJson} />
            <StyledMessageComponent message={msg}>
              {msg.isMagicLink ? (
                <Alert
                  message="Transaction Ready"
                  description={
                    <div>
                      <p>Click the button below to sign the transaction:</p>
                      <Button type="primary" href={msg.text} target="_blank">
                        Sign Transaction
                      </Button>
                    </div>
                  }
                  type="info"
                  showIcon
                />
              ) : msg.isJson ? (
                <JsonMessage text={msg.text} />
              ) : (
                <MessageContent message={msg} />
              )}
            </StyledMessageComponent>
          </StyledMessageContainer>
        ))}
      </StyledChatArea>
      <StyledInputContainer>
        <StyledTextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={handleSend}
          onKeyPress={handleKeyPress}
          placeholder="Message AI Agent"
          autoSize={{ minRows: 1, maxRows: 4 }}
        />
        <StyledSendButton onClick={handleSend} icon={<ArrowUpOutlined />} />
      </StyledInputContainer>
      <StyledDisclaimer>Powered by Crypto.com</StyledDisclaimer>
    </StyledChatBotContainer>
  );
}
