'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }));
  const initializeAuth = useAuthStore((state) => state.initialize);
  const setDeferredPrompt = useAuthStore((state) => state.setDeferredPrompt);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Register PWA Service Worker & listen to install prompt
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Register service worker
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').then(
            (registration) => {
              console.log('[PWA] Service Worker registered with scope:', registration.scope);
            },
            (err) => {
              console.error('[PWA] Service Worker registration failed:', err);
            }
          );
        });
      }

      // Intercept install prompt
      const handleInstallPrompt = (e: Event) => {
        // Prevent default browser popup mini-infobar from showing
        e.preventDefault();
        // Stash the event so it can be triggered later
        setDeferredPrompt(e);
        console.log('[PWA] Intercepted install prompt. Ready for custom trigger.');
      };

      window.addEventListener('beforeinstallprompt', handleInstallPrompt);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      };
    }
  }, [setDeferredPrompt]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
