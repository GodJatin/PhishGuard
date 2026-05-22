'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Lock, Activity, ArrowRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Navbar */}
      <header className="absolute top-0 w-full z-50 border-b border-white/5 bg-background/50 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            <span className="font-bold text-xl tracking-tight">PhishGuard</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Link href="/signup" className={buttonVariants({ size: "sm", className: "bg-blue-600 hover:bg-blue-700 text-white" })}>
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Decorative background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none" />
      
      <main className="flex-1 flex flex-col items-center justify-center pt-32 pb-16 z-10 px-4">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-400 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
              Next-Gen URL Analysis Engine Active
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
              Detect Threats Before <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">They Strike.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto font-medium">
              PhishGuard uses advanced AI models and heuristic rules to instantly scan, analyze, and neutralize malicious URLs in real-time.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link href="/signup" className={buttonVariants({ size: "lg", className: "w-full sm:w-auto h-12 px-8 text-base bg-blue-600 hover:bg-blue-700" })}>
              Get Started <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg", className: "w-full sm:w-auto h-12 px-8 text-base border-white/10 hover:bg-white/5" })}>
              Access Dashboard
            </Link>
            <button 
              onClick={() => {
                useAuthStore.getState().setGuest(true);
                router.push('/dashboard');
              }}
              className={buttonVariants({ variant: "ghost", size: "lg", className: "w-full sm:w-auto h-12 px-8 text-base text-muted-foreground hover:text-foreground hover:bg-white/5 active:scale-95 border border-dashed border-white/10 hover:border-white/20 transition-all cursor-pointer" })}
            >
              Continue as Guest
            </button>
          </motion.div>
        </div>

        {/* Feature Highlights */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
        >
          <div className="p-6 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/20">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-time Analysis</h3>
            <p className="text-muted-foreground text-sm">Scan URLs instantly with our high-speed evaluation engine powered by advanced ML models.</p>
          </div>
          <div className="p-6 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4 border border-purple-500/20">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Enterprise Security</h3>
            <p className="text-muted-foreground text-sm">Bank-grade encryption and secure infrastructure protecting your scanning history and reports.</p>
          </div>
          <div className="p-6 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4 border border-cyan-500/20">
              <Lock className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Heuristic Detection</h3>
            <p className="text-muted-foreground text-sm">Beyond signature matching. We detect zero-day phishing attacks using behavioral heuristics.</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
