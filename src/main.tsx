import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { BaseStyles, HighChartStyles, ThemeProvider } from '@miq/fiber-ui';
import { StoreProvider } from './state/Store';
import { GenieProvider } from './genie/GenieProvider';
import { App } from './App';
import './styles/fiber.css';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BaseStyles />
      <HighChartStyles container={false} />
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <StoreProvider>
          <GenieProvider>
            <App />
          </GenieProvider>
        </StoreProvider>
      </HashRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
