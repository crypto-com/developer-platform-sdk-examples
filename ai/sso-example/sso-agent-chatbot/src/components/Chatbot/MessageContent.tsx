import { TypingIndicator } from "./TypingIndicator";
import { Message } from "./interfaces";
import { StyledMessageContent } from "./styles";

interface MessageContentProps {
  message: Message;
}
export function MessageContent({ message }: MessageContentProps) {
  return (
    <StyledMessageContent>
      {message.isLoading ? <TypingIndicator /> : message.text}
    </StyledMessageContent>
  );
}
