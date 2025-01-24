import styled from "styled-components";
import Logo from "../../assets/chain-ai-logo.webp";
import { Button } from "antd";

export const StyledSidebar = styled.div`
  width: 280px;
  background-color: #f0f0f0;
  display: flex;
  flex-direction: column;
  padding: 20px;
`;

export const StyledCreateButton = styled.div`
  margin-left: auto;
`;

export const StyledLogoContainer = styled.div`
  gap: 10px;
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
`;

export const StyledLogo = styled.div`
  width: 30px;
  height: 60px; // Adjust height as needed
  background-image: url(${Logo});
  background-size: contain;
  background-repeat: no-repeat;
  background-position: left;
`;

export const StyledButton = styled(Button)`
  display: flex;
  align-items: center;
  justify-content: flex-start; /* Ensure content starts from the left */
  margin-top: 20px;
  padding: 20px 10px;
  border: none;
  background-color: transparent;
  color: black;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  box-shadow: none;

  .anticon {
    margin-right: 4px;
  }

  &:hover,
  &:focus {
    background-color: #0000000f !important;
    color: black !important;
  }
`;
