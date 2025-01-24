import { InputType, Label } from "./interfaces";
import { StyledMessageLabel } from "./styles";

interface MessageLabelProps {
  type: InputType;
  isJson?: boolean;
}
export function MessageLabel({ type, isJson }: MessageLabelProps) {
  return (
    <StyledMessageLabel>
      {type === InputType.User ? Label.User : isJson ? Label.Data : Label.Bot}
    </StyledMessageLabel>
  );
}
