
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Suppress known non-critical errors from external environments (e.g., MetaMask extensions in iframes)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message?.includes('MetaMask') || event.message?.includes('ethereum')) {
      event.preventDefault();
      console.warn('Suppressed external provider error:', event.message);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('MetaMask') || event.reason?.message?.includes('ethereum')) {
      event.preventDefault();
      console.warn('Suppressed external provider rejection:', event.reason.message);
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
