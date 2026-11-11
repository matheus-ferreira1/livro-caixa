import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { expireSession } from '@/features/auth/api';
import { createQueryClient } from '@/shared/api/query-client';
import { PreferencesProvider } from '@/shared/i18n/PreferencesProvider';
import { Toaster } from '@/shared/ui/sonner';
import { routes } from './routes';
import './index.css';

const queryClient = createQueryClient({ onUnauthorized: expireSession });
const router = createBrowserRouter(routes);
const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <RouterProvider router={router} />
        <Toaster />
      </PreferencesProvider>
    </QueryClientProvider>
  </StrictMode>,
);
