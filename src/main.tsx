import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Açaí Delivery PWA registrado com sucesso no escopo:', registration.scope);
      })
      .catch((error) => {
        console.log('Registro do Service Worker falhou:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary componentName="Aplicativo">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

