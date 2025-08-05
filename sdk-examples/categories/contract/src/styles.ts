import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #000000;
  }

  body a {
    color: #1199FA;
  }

  a {
      color: #007bff;
      text-decoration: none;
      background-color: transparent;
  }
`;

export default GlobalStyles;
