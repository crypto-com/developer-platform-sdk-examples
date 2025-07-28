import { createRoot } from "react-dom/client";
import GlobalStyles from "./styles";
import React from "react";
import { TransactionExample } from "./app/Transaction/index.tsx";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <GlobalStyles />
    <TransactionExample />
  </React.StrictMode>,
);
