import { StyledCopyButton } from "./styles";

interface CopyButtonProps {
  text: string;
}
export function CopyButton({ text }: CopyButtonProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(
      () => alert("Copied to clipboard!"),
      (err) => console.error("Could not copy text: ", err)
    );
  };
  return (
    <StyledCopyButton onClick={handleCopy}>
      Copy Code
      <svg viewBox="0 0 24 24">
        <path d="M0 0h24v24H0z" fill="none" />
        <path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-3-9h-2V7h2v3zm-4 0H9V7h3v3zm-1 4H9v-2h2v2zm1 1h2v3h-2v-3z" />
      </svg>
    </StyledCopyButton>
  );
}
