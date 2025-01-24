import { ReactNode } from "react";
import { StyledButtonContainer, StyledButtonText } from "./styles";

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export default function Button({ children, onClick, disabled }: ButtonProps) {
  return (
    <StyledButtonContainer onClick={onClick} disabled={disabled}>
      <StyledButtonText>{children}</StyledButtonText>
    </StyledButtonContainer>
  );
}
