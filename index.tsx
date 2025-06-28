import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './components/auth/AuthContext';
import { ToastProvider } from './contexts/ToastContext'; // Import ToastProvider

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider> {/* ToastProvider now wraps App */}
        <App />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);