import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import GlobalStyles from './styles';
import { WalletExample } from './app/Wallet';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <GlobalStyles />
      <Routes>
        <Route path="/" element={<WalletExample />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
