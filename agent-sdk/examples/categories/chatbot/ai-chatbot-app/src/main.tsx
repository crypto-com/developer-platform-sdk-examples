import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Chatbot } from './app/Chatbot';
import GlobalStyles from './styles';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <GlobalStyles />
      <Routes>
        <Route path="/" element={<Chatbot />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
