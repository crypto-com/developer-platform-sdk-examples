import { createRoot } from "react-dom/client";
import React from "react";
import { TokenExample } from "./app/Token/index.tsx";
import GlobalStyles from "./styles.ts";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <GlobalStyles />
    <TokenExample />
  </React.StrictMode>,
);
