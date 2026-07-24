import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import './index.css';
import App from './App.tsx';
import { ConfirmProvider } from './components/ConfirmDialog';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfirmProvider>
      <App />
      <Toaster richColors position="top-right" closeButton />
    </ConfirmProvider>
  </StrictMode>,
);
