'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * GlobalOfflineBanner
 *
 * Listens to window "online" / "offline" events and shows a persistent
 * amber banner when the user loses network connectivity.
 * Briefly shows a green "back online" confirmation before disappearing.
 *
 * Mount once inside the root layout or a shared layout component.
 */
export default function GlobalOfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showRestored, setShowRestored] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Use queueMicrotask to avoid synchronous setState calls in the effect body,
    // which can cause cascading re-renders (react-hooks/set-state-in-effect).
    queueMicrotask(() => {
      setMounted(true);
      setIsOnline(navigator.onLine);
    });

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      // Hide the "back online" message after 3 seconds
      const t = setTimeout(() => setShowRestored(false), 3000);
      return () => clearTimeout(t);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Don't render anything during SSR or when fully online with no restoration message
  if (!mounted || (isOnline && !showRestored)) return null;

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          key="offline-banner"
          initial={{ opacity: 0, y: -48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -48 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 px-4 py-2.5 bg-amber-950/95 border-b border-amber-500/40 backdrop-blur-md text-amber-300 text-sm font-medium shadow-lg"
          role="alert"
          aria-live="assertive"
        >
          <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <span className="font-semibold">You are offline.</span>
            {' '}Some features may be unavailable. Scans require an active connection.
          </span>
        </motion.div>
      )}

      {isOnline && showRestored && (
        <motion.div
          key="online-restored-banner"
          initial={{ opacity: 0, y: -48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -48 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 px-4 py-2.5 bg-emerald-950/95 border-b border-emerald-500/40 backdrop-blur-md text-emerald-300 text-sm font-medium shadow-lg"
          role="status"
          aria-live="polite"
        >
          <Wifi className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>
            <span className="font-semibold">Connection restored.</span>
            {' '}PhishGuard is back online.
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
