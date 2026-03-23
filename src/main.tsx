import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter as Router } from 'react-router-dom';
import { AppThemeProvider } from './ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import LoadingPage from './pages/LoadingPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <AppThemeProvider>
        <Router>
          <QueryClientProvider client={queryClient}>
            <Suspense fallback={<LoadingPage />}>
              <App />
            </Suspense>
          </QueryClientProvider>
        </Router>
      </AppThemeProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
