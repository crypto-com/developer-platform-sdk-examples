import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ChatPage } from "./pages/ChatPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  );
}
