'use client';

import { useEffect } from 'react';

export default function AnimatedTitle() {
  useEffect(() => {
    const originalTitle = '🛡️ PhishGuard | Threat Intel ';
    let currentTitle = originalTitle;
    
    const interval = setInterval(() => {
      currentTitle = currentTitle.substring(1) + currentTitle.substring(0, 1);
      document.title = currentTitle;
    }, 400);

    return () => {
      clearInterval(interval);
      document.title = 'PhishGuard | Smart Phishing URL Detection Platform';
    };
  }, []);

  return null;
}
