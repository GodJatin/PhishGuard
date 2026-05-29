'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ShieldCheck, Loader2 } from 'lucide-react';
import Logo from '../logo';

interface SplashScreenProps {
  onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Remove sessionStorage check so it plays on every refresh


    // Sequence timer:
    // Step 0: Logo Pulse (0ms to 900ms)
    // Step 1: Threat Intel Initializing (900ms to 1800ms)
    // Step 2: Modules Online (1800ms to 2500ms)
    // Step 3: Complete & Fade-out (2500ms+)
    const timer1 = setTimeout(() => setStep(1), 900);
    const timer2 = setTimeout(() => setStep(2), 1800);
    const timer3 = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 4500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeOut' } }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070709] text-white"
      >
        {/* Mesh grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#111215_1px,transparent_1px),linear-gradient(to_bottom,#111215_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none opacity-40" />
        
        {/* Center glowing element */}
        <div className="absolute w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="z-10 absolute inset-0 w-full h-full flex flex-col items-center justify-center">
          
          {/* Video Animation */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="w-full h-full flex justify-center items-center"
          >
            <video 
               src="/splash_screen.mp4" 
               autoPlay 
               muted 
               playsInline 
               className="w-full h-full object-contain mix-blend-screen"
            />
          </motion.div>
        </div>

        {/* Stepper Status Content */}
        <div className="absolute bottom-12 left-0 right-0 z-20 flex flex-col items-center justify-center font-mono space-y-6">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs text-muted-foreground flex items-center gap-2"
                >
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                  <span>PHISHGUARD INTELLIGENCE V2.4</span>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="text-center space-y-1.5"
                >
                  <div className="text-xs text-emerald-400 flex items-center justify-center gap-2 font-bold tracking-wider">
                    <Terminal className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
                    THREAT INTEL INITIALIZING...
                  </div>
                  <div className="text-[10px] text-muted-foreground tracking-widest uppercase">
                    Loading signatures & ML weights
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="text-center space-y-1.5"
                >
                  <div className="text-xs text-emerald-400 flex items-center justify-center gap-1.5 font-bold tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    SECURITY MODULES ONLINE
                  </div>
                  <div className="text-[10px] text-emerald-500/70 tracking-widest uppercase font-bold">
                    Console ready
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          {/* Micro Progress Bar */}
          <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
              initial={{ width: '0%' }}
              animate={{ 
                width: step === 0 ? '30%' : step === 1 ? '70%' : '100%' 
              }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
            />
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
