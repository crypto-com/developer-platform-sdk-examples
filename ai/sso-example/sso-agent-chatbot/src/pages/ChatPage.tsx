import { Chatbot } from "../components/Chatbot";
import { Navigation } from "../components/Navigation";
import { StyledChatPageContainer } from "./styles";

export function ChatPage() {
  return (
    <StyledChatPageContainer>
      <Navigation />
      <div style={{ width: "700px", height: "100vh", flexGrow: 1 }}>
        <Chatbot />
      </div>
    </StyledChatPageContainer>
  );
}
