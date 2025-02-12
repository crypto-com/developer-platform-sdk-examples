import { Chatbot } from "../components/Chatbot";
import { Navigation } from "../components/Navigation";
import { WagmiConfig } from "../sso/constants";
import { StyledChatPageContainer } from "./styles";
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export function ChatPage() {
  return (
    <StyledChatPageContainer>
      <WagmiProvider config={WagmiConfig} >
      <QueryClientProvider client={queryClient}>
      <Navigation />
      <div style={{ width: "700px", height: "100vh", flexGrow: 1 }}>
        <Chatbot />
        </div>
        </QueryClientProvider>
      </WagmiProvider>
    </StyledChatPageContainer>
  );
}
