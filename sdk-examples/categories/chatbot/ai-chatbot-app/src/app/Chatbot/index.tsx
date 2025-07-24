import ReactMarkdown from 'react-markdown';
import { useState, useRef, useEffect } from 'react';
import {
  ChatToggleButton,
  ChatWindow,
  ChatHeader,
  ChatMessages,
  MessageContainer,
  MessageBubble,
  MarkdownMessage,
  ChatInputContainer,
  ChatInput,
} from './styles';

export function Chatbot(): JSX.Element {
  const [thread, setThread] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thread, loading]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    const updatedThread = [...thread, userMessage];
    setThread(updatedThread);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_CHATBOT_SERVER_BASE_URL}/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: input, thread }),
        }
      );

      const data = await res.json();
      const aiResponse = data.thread[data.thread.length - 1];
      setThread([...updatedThread, aiResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      setThread([
        ...updatedThread,
        {
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <ChatToggleButton onClick={() => setIsOpen(!isOpen)}>
        Chatbot
      </ChatToggleButton>

      {isOpen && (
        <ChatWindow>
          <ChatHeader>Chatbot: Crypto.com AI Agent</ChatHeader>

          <ChatMessages>
            {thread.map((m, idx) => (
              <MessageContainer key={idx} isUser={m.role === 'user'}>
                <MessageBubble isUser={m.role === 'user'}>
                  {m.role === 'user' ? (
                    m.content
                  ) : (
                    <MarkdownMessage>
                      <ReactMarkdown children={m.content} />
                    </MarkdownMessage>
                  )}
                </MessageBubble>
              </MessageContainer>
            ))}
            {loading && (
              <MessageContainer isUser={false}>
                <MessageBubble isUser={false}>
                  <em>typing…</em>
                </MessageBubble>
              </MessageContainer>
            )}
            <div ref={bottomRef} />
          </ChatMessages>

          <ChatInputContainer>
            <ChatInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message and hit Enter..."
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading}
            />
          </ChatInputContainer>
        </ChatWindow>
      )}
    </div>
  );
}
