'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,          // 1 minute stale time
        retry: 1,                       // retry once on failure
        retryDelay: 2000,              // 2 second backoff
        refetchOnWindowFocus: false,   // don't refetch on tab switch — reduces noise
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
    if (typeof window === 'undefined') return;

    // Register service worker safely — skip if not supported or not HTTPS
    const registerSW = async () => {
      if (!('serviceWorker' in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[PWA] Service Worker registered with scope:', registration.scope);
      } catch (err) {
        // Non-fatal — app works fine without SW
        console.warn('[PWA] Service Worker registration failed:', err);
      }
    };

    // Register after window load to not block initial page render
    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW, { once: true });
    }

    // Intercept install prompt for custom PWA install button
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('[PWA] Intercepted install prompt. Ready for custom trigger.');
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, [setDeferredPrompt]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

