import { ArrowUpOutlined } from '@ant-design/icons';
import { Alert, Button, Select } from 'antd';
import { useState } from 'react';
import { getChatStartDate } from '../../helpers/chat.helpers';
import { chainAiInstance } from '../../integration/chain-ai.api';
import {
  ChainAiApiResponse,
  ChainAiApiResponseError,
} from '../../integration/chain-ai.interface';
import { InputType, Message } from './interfaces';
import { JsonMessage } from './JsonMessage';
import { MessageContent } from './MessageContent';
import { MessageLabel } from './MessageLabel';
import {
  StyledChatArea,
  StyledChatBotContainer,
  StyledDateLabel,
  StyledDateLabelContainer,
  StyledDisclaimer,
  StyledInputContainer,
  StyledMessageComponent,
  StyledMessageContainer,
  StyledModelSelector,
  StyledSendButton,
  StyledTextArea,
} from './styles';

export interface LLMConfig {
  llmProvider: LLMProvider;
  model: string;
  label: string;
}

export enum LLMProvider {
  OpenAI = 'openai',
  Gemini = 'gemini',
  VertexAI = 'vertexai',
  DeepSeek = 'deepseek',
  Mistral = 'mistral',
}

const LLM_OPTIONS: LLMConfig[] = [
  {
    llmProvider: LLMProvider.DeepSeek,
    model: 'deepseek-chat',
    label: 'Deepseek-V3',
  },
  {
    llmProvider: LLMProvider.Mistral,
    model: 'ministral-3b-latest',
    label: 'Ministral-3b-latest',
  },
  {
    llmProvider: LLMProvider.Mistral,
    model: 'ministral-8b-latest',
    label: 'Ministral-8b-latest',
  },
  {
    llmProvider: LLMProvider.Mistral,
    model: 'mistral-large-latest',
    label: 'Mistral-Large-Latest',
  },
  {
    llmProvider: LLMProvider.Mistral,
    model: 'mistral-small-latest',
    label: 'Mistral-Small-Latest',
  },

  { llmProvider: LLMProvider.OpenAI, model: 'gpt-4o', label: 'GPT-4o' },
  {
    llmProvider: LLMProvider.OpenAI,
    model: 'gpt-4o-mini',
    label: 'GPT-4o-Mini',
  },
  {
    llmProvider: LLMProvider.OpenAI,
    model: 'gpt-4-turbo',
    label: 'GPT-4-Turbo',
  },
  { llmProvider: LLMProvider.OpenAI, model: 'gpt-4', label: 'GPT-4' },
  {
    llmProvider: LLMProvider.OpenAI,
    model: 'gpt-3.5-turbo',
    label: 'GPT-3.5-Turbo',
  },
  {
    llmProvider: LLMProvider.Gemini,
    model: 'gemini-2.0-flash-exp',
    label: 'Gemini-2.0-Flash-Exp',
  },
  {
    llmProvider: LLMProvider.Gemini,
    model: 'gemini-1.5-flash',
    label: 'Gemini-1.5-Flash',
  },
  {
    llmProvider: LLMProvider.Gemini,
    model: 'gemini-1.5-pro',
    label: 'Gemini-1.5-Pro',
  },
  {
    llmProvider: LLMProvider.Gemini,
    model: 'gemini-1.0-pro',
    label: 'Gemini-1.0-Pro',
  },
];

export function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [context, setContext] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [selectedLLM, setSelectedLLM] = useState<LLMConfig>(LLM_OPTIONS[0]);

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
            text: response.finalResponse || response.status || 'Unknown status',
            isLoading: false,
          };
        }
      }
      return newMessages;
    });

    if (response.context) {
      setContext((prevContext) => {
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
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    const userInput = input.trim();
    if (!userInput) return;

    addMessage(userInput, InputType.User, false);
    addMessage('Typing...', InputType.Bot, true);
    setInput('');

    try {
      const response = await chainAiInstance.sendQuery(
        userInput,
        context,
        selectedLLM
      );
      console.log(response);
      updateBotResponse(response);
    } catch (e) {
      const error = e as ChainAiApiResponseError;
      console.error('Failed to send query:', e);
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
        <StyledModelSelector>
          <Select
            value={selectedLLM.model}
            onChange={(value: string) => {
              const newLLM = LLM_OPTIONS.find((opt) => opt.model === value);
              if (newLLM) setSelectedLLM(newLLM);
            }}
            options={LLM_OPTIONS.map((opt) => ({
              value: opt.model,
              label: opt.label,
            }))}
          />
        </StyledModelSelector>
        <StyledSendButton onClick={handleSend} icon={<ArrowUpOutlined />} />
      </StyledInputContainer>
      <StyledDisclaimer>Powered by Crypto.com</StyledDisclaimer>
    </StyledChatBotContainer>
  );
}
