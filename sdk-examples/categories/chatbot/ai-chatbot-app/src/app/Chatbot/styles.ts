import { styled } from 'styled-components';

export const ChatToggleButton = styled.button`
  position: fixed;
  font-size: 18px;
  bottom: 16px;
  left: 16px;
  background-color: #0061a8;
  color: white;
  padding: 12px 24px;
  border-radius: 45px;
  border: 0;
  z-index: 50;
  &:hover {
    cursor: pointer;
  }
`;

export const ChatWindow = styled.div`
  position: fixed;
  bottom: 96px;
  left: 16px;
  width: 400px;
  border: 1px solid #3e3e3e;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  height: 500px;
  z-index: 50;
  line-height: 30px;
`;

export const ChatHeader = styled.div`
  padding: 12px;
  font-weight: 600;
  background: #202124;
  color: #ffffff;
  border-radius: 20px 20px 0 0;
`;

export const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background: #131314;
  display: flex;
  flex-direction: column;
  gap: 12px;

  /* Custom Scrollbar */
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;

  &::-webkit-scrollbar {
    width: 2px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.15);
    border-radius: 1px;
  }
`;

export const MessageContainer = styled.div<{ isUser: boolean }>`
  display: flex;
  flex-direction: ${(props) => (props.isUser ? 'row-reverse' : 'row')};
  align-items: flex-start;
  gap: 8px;
`;

export const MessageBubble = styled.div<{ isUser: boolean }>`
  background-color: ${(props) => (props.isUser ? '#0061a8' : '#424242')};
  color: #f1f1f1;
  padding: 15px;
  border-radius: ${(props) =>
    props.isUser ? '15px 0 15px 15px' : '0 15px 15px 15px'};
  word-break: break-word;
  overflow-wrap: anywhere;
`;

export const ChatInputContainer = styled.div`
  padding: 12px;
  border-top: 1px solid #3e3e3e;
  background: #131314;
  border-radius: 0 0 20px 20px;
`;

export const ChatInput = styled.input`
  width: 100%;
  background: transparent;
  padding: 8px;
  border: none;
  border-radius: 6px;
  outline: none;
  color: white;
  font-size: 18px;
`;

export const MarkdownMessage = styled.div`
  color: #f1f1f1;
  font-size: 18px;
  line-height: 20px;

  word-break: break-word;
  overflow-wrap: anywhere;

  h1,
  h2,
  h3 {
    font-weight: bold;
    margin: 8px 0 4px;
  }

  p {
    margin: 4px 0;
  }

  ul,
  ol {
    padding-left: 19.2px;
    margin: 4px 0;
  }

  li {
    margin-bottom: 4px;
  }

  strong {
    font-weight: bold;
  }

  em {
    font-style: italic;
  }
`;
