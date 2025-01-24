import { SSOButton } from "../../sso/SSOButton";
import {
  StyledSidebar,
  StyledLogo,
  StyledButton,
  StyledLogoContainer,
  StyledCreateButton,
} from "../Navigation/styles";
import {
  BlockOutlined,
  WalletOutlined,
  PicCenterOutlined,
  FormOutlined,
} from "@ant-design/icons";

export function Navigation() {
  return (
    <StyledSidebar>
      <StyledLogoContainer>
        <StyledLogo /> Crypto.Com AI Agent
        <StyledCreateButton>
          <FormOutlined />
        </StyledCreateButton>
      </StyledLogoContainer>
      <SSOButton /> 
      <StyledButton
        onClick={() => console.log("Button 1 clicked")}
        icon={<BlockOutlined />}
      >
        Get Latest Block
      </StyledButton>
      <StyledButton
        onClick={() => console.log("Button 2 clicked")}
        icon={<WalletOutlined />}
      >
        Create Wallet
      </StyledButton>
      <StyledButton
        onClick={() => console.log("Button 3 clicked")}
        icon={<PicCenterOutlined />}
      >
        Get Block Status
      </StyledButton>
    </StyledSidebar>
  );
}
