import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { USE_MOCK_API } from '@/api';
import { AppSettingsProvider } from '@/contexts';
import { QueryProvider } from '@/providers';

// Initialize i18n before rendering
import '@/i18n';

import App from './App.tsx';
import './index.css';

async function enableMocking() {
  if (!USE_MOCK_API) {
    return;
  }

  const { worker } = await import('@/test/mocks/browser');
  return worker.start({
    onUnhandledRequest: 'bypass',
  });
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppSettingsProvider>
        <QueryProvider>
          <App />
        </QueryProvider>
      </AppSettingsProvider>
    </StrictMode>,
  );
});
