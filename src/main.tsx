import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UIProvider } from './contexts/UIContext';

console.log("APP STARTING...");

window.onerror = function(message, source, lineno, colno, error) {
  console.error("GLOBAL ERROR:", { message, source, lineno, colno, error });
};

window.onunhandledrejection = function(event) {
  event.preventDefault();
  console.warn("UNHANDLED PROMISE REJECTION RAW:", event.reason);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <UIProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </UIProvider>
    </ErrorBoundary>
  </StrictMode>,
);
