import { CopyButton } from "./CopyButton";
import { StyledJsonMessageHeader, StyledMessageContent } from "./styles";

interface JsonMessageProps {
  text: string;
}
export function JsonMessage({ text }: JsonMessageProps) {
  return (
    <>
      <StyledJsonMessageHeader>
        <span>JSON</span>
        <CopyButton text={text} />
      </StyledJsonMessageHeader>
      <StyledMessageContent isJson as="pre">
        {text}
      </StyledMessageContent>
    </>
  );
}
