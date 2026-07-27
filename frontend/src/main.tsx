import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import './index.css';
import App from './App.tsx';
import { ConfirmProvider, UnsavedGuardProvider } from './components/ConfirmDialog';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfirmProvider>
      <UnsavedGuardProvider>
        <App />
        <Toaster richColors position="top-right" closeButton />
      </UnsavedGuardProvider>
    </ConfirmProvider>
  </StrictMode>,
);
