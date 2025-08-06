import { createRoot } from "react-dom/client";
import GlobalStyles from "./styles";
import React from "react";
import App from "./App.tsx";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <GlobalStyles />
    <App />
  </React.StrictMode>,
);
