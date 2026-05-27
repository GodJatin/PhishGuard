'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, Variants } from 'framer-motion';
import { 
  Shield, Lock, Activity, ArrowRight, Brain, Cpu, 
  Layers, Globe, Download, CheckCircle2, ShieldCheck, ShieldAlert, Terminal, AlertTriangle 
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';

export default function Home() {
  const router = useRouter();

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 }
    }
  };


  return (
    <div className="min-h-screen bg-[#070709] text-white relative overflow-hidden flex flex-col font-sans">
      
      {/* Mesh Background Grid - CSS Only */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f0f15_1px,transparent_1px),linear-gradient(to_bottom,#0f0f15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40" />
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <header className="sticky top-0 w-full z-50 border-b border-white/[0.05] bg-black/40 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.1)]">
              <Shield className="w-4.5 h-4.5 text-blue-500" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              PhishGuard
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/signup" className={buttonVariants({ size: "sm", className: "bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-[0_4px_12px_rgba(37,99,235,0.2)]" })}>
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Main SaaS Content */}
      <main className="flex-1 flex flex-col items-center">
        
        {/* HERO SECTION */}
        <section className="container mx-auto px-4 pt-24 pb-16 max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <motion.div 
            className="lg:col-span-7 space-y-6 text-left"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-3 py-1 text-xs font-semibold text-blue-400">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              Layered Cybersecurity Intelligence Platform Active
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
              Phishing Detection <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Accelerated by AI.
              </span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-base md:text-lg text-neutral-400 font-normal leading-relaxed max-w-xl">
              Upgrade from a simple scanner to PhishGuard's multi-layered threat intelligence network. Evaluate domains through heuristic engines, spoof matchers, and Machine Learning models.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link href="/signup" className={buttonVariants({ size: "lg", className: "w-full sm:w-auto h-11 px-6 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-500/10" })}>
                Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg", className: "w-full sm:w-auto h-11 px-6 text-sm border-white/10 hover:bg-white/5 text-neutral-300 font-medium" })}>
                Go to Dashboard
              </Link>
              <button 
                onClick={() => {
                  useAuthStore.getState().setGuest(true);
                  router.push('/dashboard');
                }}
                className={buttonVariants({ variant: "ghost", size: "lg", className: "w-full sm:w-auto h-11 px-6 text-sm border border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02] text-neutral-400 hover:text-white cursor-pointer" })}
              >
                Try as Guest
              </button>
            </motion.div>
          </motion.div>

          {/* Interactive Threat Simulator Card */}
          <motion.div 
            className="lg:col-span-5 w-full relative"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 70 }}
          >
            {/* Soft decorative glow behind card */}
            <div className="absolute inset-0 bg-blue-500/5 rounded-2xl blur-3xl pointer-events-none" />
            
            <div className="border border-white/[0.08] bg-[#0d0d12]/90 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between px-4 py-3 bg-[#13131a] border-b border-white/[0.05] text-xs font-mono text-neutral-400">
                <span className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-blue-500" />
                  threat_aggregator_scan.log
                </span>
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              <div className="p-5 space-y-4 font-mono text-xs text-left">
                <div className="space-y-1">
                  <p className="text-neutral-500">$ phishguard scan --url "http://paypa1-verify.xyz/login"</p>
                  <p className="text-blue-400">⚡ Initializing 7-Layer Detection Pipeline...</p>
                </div>
                <div className="space-y-1.5 border-l-2 border-blue-500/30 pl-3">
                  <p className="text-neutral-400">[Layer 1] Whitelist ... <span className="text-green-500">CLEAN</span></p>
                  <p className="text-neutral-400">[Layer 2] Blacklist ... <span className="text-red-400">ALERT: Match path pattern</span></p>
                  <p className="text-neutral-400">[Layer 3] Brand Spoof ... <span className="text-red-400">ALERT: Levenshtein distance 1 to "PayPal"</span></p>
                  <p className="text-neutral-400">[Layer 4] ML Classifier ... <span className="text-red-400">ALERT: Phishing confidence 94.6%</span></p>
                </div>
                <div className="pt-2 border-t border-white/[0.05] space-y-2">
                  <div className="flex justify-between items-center bg-red-950/20 border border-red-500/20 p-2.5 rounded-lg">
                    <div>
                      <p className="font-bold text-red-400">CRITICAL THREAT DETECTED</p>
                      <p className="text-[10px] text-neutral-400">URL impersonates protected financial trademark.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-500">95/100</p>
                    </div>
                  </div>
                  
                  {/* Floating insight widget */}
                  <div className="flex items-center gap-2 p-2 bg-white/5 rounded border border-white/10 text-neutral-300">
                    <Brain className="w-4 h-4 text-purple-400 flex-shrink-0 animate-pulse" />
                    <span>ML dynamic interpretation generated</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Micro stats banner floating */}
            <div className="absolute -bottom-6 -left-6 bg-[#121218]/90 border border-white/10 p-3 rounded-lg flex items-center gap-3 shadow-xl backdrop-blur-md hidden sm:flex">
              <div className="w-8 h-8 rounded bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider font-semibold">Verification</p>
                <p className="text-xs font-bold font-mono">0 False Positives</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* SECTION 2 — PIPELINE VISUALIZATION */}
        <section className="w-full border-t border-white/[0.05] bg-gradient-to-b from-[#09090d] to-transparent py-20">
          <div className="container mx-auto px-4 max-w-5xl text-center space-y-12">
            <div className="space-y-3 max-w-xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">The Layered Intelligence Pipeline</h2>
              <p className="text-sm text-neutral-400">
                How PhishGuard scrutinizes every URL in real-time, executing independent checks for transparent results.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { step: "1", title: "Whitelist", desc: "Instant bypass for verified safe entities", icon: <CheckCircle2 className="w-4 h-4 text-green-400" /> },
                { step: "2", title: "Blacklist", desc: "Exact matches & regex path signatures", icon: <ShieldAlert className="w-4 h-4 text-red-400" /> },
                { step: "3", title: "Brand Spoof", desc: "Levenshtein + homoglyph analysis", icon: <AlertTriangle className="w-4 h-4 text-yellow-400" /> },
                { step: "4", title: "Rule Engine", desc: "15+ structural behavioral checks", icon: <Cpu className="w-4 h-4 text-cyan-400" /> },
                { step: "5", title: "ML Classifier", desc: "RandomForest probability model", icon: <Brain className="w-4 h-4 text-purple-400" /> },
                { step: "6", title: "Aggregator", desc: "Correlated score & export reports", icon: <Layers className="w-4 h-4 text-blue-400" /> }
              ].map((layer, idx) => (
                <motion.div 
                  key={idx}
                  className="p-4 rounded-xl border border-white/[0.05] bg-[#0d0d12]/50 hover:bg-[#13131c]/60 hover:border-white/10 transition-all text-left space-y-2 relative"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">Layer {layer.step}</span>
                    {layer.icon}
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-white">{layer.title}</h3>
                  <p className="text-[11px] text-neutral-400 font-mono leading-relaxed">{layer.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3 — ENGINE DIVERGENCE COMPARISON */}
        <section className="w-full border-t border-white/[0.05] py-20">
          <div className="container mx-auto px-4 max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-5 space-y-4 text-left">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
                Comparison Intelligence
              </h2>
              <p className="text-sm text-neutral-400 leading-relaxed font-mono">
                Security shouldn't be a black box. PhishGuard pits deterministic logic against adaptive statistics side-by-side. 
              </p>
              <ul className="space-y-2 text-xs font-mono text-neutral-300">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Rule heuristics isolate known pattern markers.
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                  ML predicts statistical anomalies in raw layout.
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  Divergence logic explains score differences.
                </li>
              </ul>
            </div>
            
            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-cyan-500/10 bg-cyan-950/5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-500/30" />
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 mb-4">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="font-bold text-sm mb-1">Deterministic Rules</h3>
                <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                  Fast, reproducible matching of specific strings, length limits, IP domains, and suspicious characters.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-purple-500/10 bg-purple-950/5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-purple-500/30" />
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 mb-4">
                  <Brain className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-bold text-sm mb-1">Adaptive Random Forest</h3>
                <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                  Evaluates 15 structural features simultaneously to predict the probability of zero-day spoof attempts.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4 — FEATURE GRID */}
        <section className="w-full border-t border-white/[0.05] py-20 bg-gradient-to-b from-transparent to-[#050507]">
          <div className="container mx-auto px-4 max-w-5xl text-center space-y-12">
            <div className="space-y-3 max-w-xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Designed for Analysis Depth</h2>
              <p className="text-sm text-neutral-400">
                Packed with features to help security operations and analysts dig into suspicious links.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Static Threat Feeds",
                  desc: "Pre-seeded local blacklist matches domains and path prefixes instantly without external API latency.",
                  icon: <Globe className="w-5 h-5 text-blue-400" />
                },
                {
                  title: "Brand Protection Engine",
                  desc: "Identifies lookalikes using Levenshtein distance thresholds and Cyrillic/homoglyph character normalizers.",
                  icon: <Shield className="w-5 h-5 text-purple-400" />
                },
                {
                  title: "Model Explainability",
                  desc: "Highlights the top 6 contributing ML features dynamically relative to each scanned URL.",
                  icon: <Brain className="w-5 h-5 text-emerald-400" />
                },
                {
                  title: "Three Export Formats",
                  desc: "Produce compliant audit logs. Download scan details as formatted PDF, raw JSON, or lightweight TXT.",
                  icon: <Download className="w-5 h-5 text-cyan-400" />
                },
                {
                  title: "Offline Ready PWA",
                  desc: "Install directly as a progressive web application. Scans function seamlessly with offline state tracking.",
                  icon: <Lock className="w-5 h-5 text-amber-400" />
                },
                {
                  title: "Guest Trial Scanner",
                  desc: "Submit and analyze links immediately without a registered account, using isolated client-side storage.",
                  icon: <CheckCircle2 className="w-5 h-5 text-red-400" />
                }
              ].map((feat, idx) => (
                <div key={idx} className="p-6 rounded-2xl border border-white/[0.05] bg-[#0d0d12]/40 text-left space-y-3 hover:border-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                    {feat.icon}
                  </div>
                  <h3 className="font-bold text-sm text-white">{feat.title}</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed font-mono">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 5 — STATS BANNER */}
        <section className="w-full border-t border-b border-white/[0.05] bg-[#0a0a0f] py-10">
          <div className="container mx-auto px-4 max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { val: "300+", label: "intel blacklists" },
              { val: "15", label: "ml features mapped" },
              { val: "7", label: "detection layers" },
              { val: "3", label: "export formats" }
            ].map((stat, i) => (
              <div key={i} className="space-y-1">
                <p className="text-3xl font-extrabold text-blue-500 tracking-tight font-mono">{stat.val}</p>
                <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-widest font-semibold">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-8 bg-[#050507]">
        <div className="container mx-auto px-4 max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-500">
          <p>© 2026 PhishGuard. All rights reserved. Premium Threat Intelligence.</p>
          <div className="flex items-center gap-6">
            <Link href="/signup" className="hover:text-white transition-colors">Register</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <button 
              onClick={() => {
                useAuthStore.getState().setGuest(true);
                router.push('/dashboard');
              }}
              className="hover:text-white transition-colors cursor-pointer bg-transparent border-0"
            >
              Guest Scan
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
