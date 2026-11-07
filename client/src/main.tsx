import './styles/tokens.css';
import '@fontsource-variable/outfit';
import '@fontsource-variable/bricolage-grotesque';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { AuthProvider } from './auth';
import { RangeProvider } from './range';
import { queryClient } from './api/queries';
import { initTheme } from './theme';

initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RangeProvider>
            <App />
          </RangeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
