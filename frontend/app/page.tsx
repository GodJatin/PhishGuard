'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  Shield, Lock, Activity, ArrowRight, Brain, Cpu, 
  Layers, Globe, Download, CheckCircle2, ShieldCheck, ShieldAlert, Terminal, AlertTriangle, FileText
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import Logo from '@/components/shared/logo';
import ThreatIntelligenceRadar from '@/components/shared/radar';

export default function Home() {
  const router = useRouter();
  const [liveThreatCount, setLiveThreatCount] = useState(14291);
  const [activeFeeds, setActiveFeeds] = useState(382);
  const [activeScanItem, setActiveScanItem] = useState(0);

  // Stagger child reveals
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 100, damping: 15 }
    }
  };

  // Pulse metrics to simulate live intelligence
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveThreatCount(prev => prev + Math.floor(Math.random() * 3) + 1);
      if (Math.random() > 0.7) {
        setActiveFeeds(prev => prev + (Math.random() > 0.5 ? 1 : -1));
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Cycle through simulated scans
  const simulatedScans = [
    { url: 'http://paypa1-verify-secure.xyz/login', brand: 'PayPal', score: 96, status: 'DANGEROUS', category: 'Financial Fraud' },
    { url: 'https://google-accounts-recovery-portal.net', brand: 'Google', score: 88, status: 'DANGEROUS', category: 'Credential Theft' },
    { url: 'https://netflix-billing-update-check.org', brand: 'Netflix', score: 78, status: 'SUSPICIOUS', category: 'Account Verification' },
    { url: 'https://microsoft-office365-login.co.uk', brand: 'Microsoft', score: 94, status: 'DANGEROUS', category: 'Credential Theft' },
    { url: 'https://github.com', brand: 'None', score: 0, status: 'SAFE', category: 'Safe Domain' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveScanItem(prev => (prev + 1) % simulatedScans.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [simulatedScans.length]);

  return (
    <div className="min-h-screen bg-[#070709] text-white relative overflow-hidden flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
      
      {/* Animated Mesh Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111215_1px,transparent_1px),linear-gradient(to_bottom,#111215_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-50" />
      
      {/* Soft color threat pulses (no cyber overload, subtle and elegant) */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute top-[20%] right-[10%] w-[450px] h-[450px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />

      {/* Global Navbar Header */}
      <header className="sticky top-0 w-full z-50 border-b border-white/[0.05] bg-[#070709]/75 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors font-mono">
              Log in
            </Link>
            <Link 
              href="/signup" 
              className={buttonVariants({ 
                size: "sm", 
                className: "bg-emerald-600 hover:bg-emerald-700 text-[#070709] font-bold border-0 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.45)] transition-all font-mono" 
              })}
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 flex flex-col items-center w-full">
        {/* TELEMETRY TICKER */}
        <div className="w-full bg-[#111215]/40 border-b border-white/5 py-2 overflow-hidden flex items-center">
          <div className="flex whitespace-nowrap gap-16 font-mono text-[9px] text-emerald-400/70 tracking-widest uppercase animate-marquee">
            <span>⚡ SYSTEM CORE: ACTIVE</span>
            <span>•</span>
            <span>📡 THREAT DATA FEEDS SYNCHRONIZED</span>
            <span>•</span>
            <span>🤖 PRETRAINED RANDOM FOREST MODEL ONLINE</span>
            <span>•</span>
            <span>⚖️ CONSENSUS MODULE STATUS: NOMINAL</span>
            <span>•</span>
            <span>🛡️ REPUTATION IP BLACKLIST ACTIVE (300+ FEEDS)</span>
            <span>•</span>
            <span>⚡ SYSTEM CORE: ACTIVE</span>
            <span>•</span>
            <span>📡 THREAT DATA FEEDS SYNCHRONIZED</span>
            <span>•</span>
            <span>🤖 PRETRAINED RANDOM FOREST MODEL ONLINE</span>
            <span>•</span>
            <span>⚖️ CONSENSUS MODULE STATUS: NOMINAL</span>
            <span>•</span>
            <span>🛡️ REPUTATION IP BLACKLIST ACTIVE (300+ FEEDS)</span>
          </div>
        </div>
        
        {/* HERO SECTION */}
        <section className="container mx-auto px-4 pt-20 pb-16 max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <motion.div 
            className="lg:col-span-7 space-y-6 text-left"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.div 
              variants={itemVariants} 
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-mono font-semibold text-emerald-400"
            >
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Enterprise Threat Intelligence Active
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
              Phishing Intelligence <br />
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
                Accelerated by AI.
              </span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-base md:text-lg text-neutral-400 font-normal leading-relaxed max-w-xl">
              Upgrade from basic scanners to layered cybersecurity threat intelligence. PhishGuard analyzes domain structure, blacklists, and trademark similarity side-by-side with explainable ML classifiers.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link 
                href="/signup" 
                className={buttonVariants({ 
                  size: "lg", 
                  className: "w-full sm:w-auto h-12 px-6 text-sm bg-emerald-600 hover:bg-emerald-700 text-[#070709] font-bold shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 transition-all font-mono" 
                })}
              >
                Get Started Free <ArrowRight className="ml-2 w-4 h-4 text-[#070709]" />
              </Link>
              <Link 
                href="/login" 
                className={buttonVariants({ 
                  variant: "outline", 
                  size: "lg", 
                  className: "w-full sm:w-auto h-12 px-6 text-sm border-white/10 hover:bg-white/5 text-neutral-300 hover:text-white font-medium font-mono" 
                })}
              >
                Go to Dashboard
              </Link>
              <button 
                onClick={() => {
                  useAuthStore.getState().setGuest(true);
                  router.push('/dashboard');
                }}
                className={buttonVariants({ 
                  variant: "ghost", 
                  size: "lg", 
                  className: "w-full sm:w-auto h-12 px-6 text-sm border border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02] text-neutral-400 hover:text-white cursor-pointer font-mono" 
                })}
              >
                Try as Guest
              </button>
            </motion.div>

            {/* Live Stats counters */}
            <motion.div 
              variants={itemVariants} 
              className="pt-6 grid grid-cols-2 gap-4 border-t border-white/[0.05] max-w-md font-mono"
            >
              <div>
                <p className="text-xl font-bold text-emerald-400">{liveThreatCount.toLocaleString()}</p>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Trademarks Protected</p>
              </div>
              <div>
                <p className="text-xl font-bold text-cyan-400">{activeFeeds} Feeds</p>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Active Indicators Mapped</p>
              </div>
            </motion.div>
          </motion.div>

          {/* RADAR CENTERPIECE */}
          <motion.div 
            className="lg:col-span-5 w-full relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            {/* Ambient card glow */}
            <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl blur-3xl pointer-events-none" />
            <ThreatIntelligenceRadar />
          </motion.div>

        </section>

        {/* SECTION 2 — THE LAYERED INTELLIGENCE PIPELINE */}
        <section className="w-full border-t border-white/[0.05] bg-gradient-to-b from-[#0a0b0d] to-transparent py-20">
          <div className="container mx-auto px-4 max-w-5xl text-center space-y-12">
            <div className="space-y-3 max-w-xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">The 7-Layer Detection Pipeline</h2>
              <p className="text-sm text-neutral-400 font-mono">
                How PhishGuard scrutinizes every URL in real-time, executing independent checks for transparent results.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
              {[
                { step: "1", title: "Whitelist Bypass", desc: "Instant bypass for verified safe entities", icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> },
                { step: "2", title: "Blacklist Match", desc: "Exact matches & regex path signatures", icon: <ShieldAlert className="w-4 h-4 text-red-500" /> },
                { step: "3", title: "Brand Spoofing", desc: "Levenshtein + homoglyph analysis", icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> },
                { step: "4", title: "Rule Engine", desc: "15+ structural behavioral checks", icon: <Cpu className="w-4 h-4 text-cyan-400" /> },
                { step: "5", title: "ML Probability", desc: "RandomForest inference models", icon: <Brain className="w-4 h-4 text-emerald-400" /> },
                { step: "6", title: "Consensus", desc: "Divergence analysis & weightings", icon: <Layers className="w-4 h-4 text-cyan-400" /> },
                { step: "7", title: "Assessment", desc: "Severity metrics and exports", icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> }
              ].map((layer, idx) => (
                <motion.div 
                  key={idx}
                  className="p-4 rounded-xl border border-white/[0.05] bg-[#111215]/50 hover:bg-[#111215] hover:border-emerald-500/30 transition-all text-left space-y-2 relative"
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-neutral-500 uppercase tracking-widest">L{layer.step}</span>
                    {layer.icon}
                  </div>
                  <h3 className="font-bold text-xs text-white">{layer.title}</h3>
                  <p className="text-[10px] text-neutral-400 font-mono leading-normal">{layer.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3 — COMPARISON INTELLIGENCE */}
        <section className="w-full border-t border-white/[0.05] py-20 bg-[#070709]">
          <div className="container mx-auto px-4 max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-5 space-y-4 text-left">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
                Comparison Intelligence
              </h2>
              <p className="text-sm text-neutral-400 leading-relaxed font-mono">
                Security shouldn't be a black box. PhishGuard pits deterministic logic against adaptive statistics side-by-side. 
              </p>
              <ul className="space-y-3 text-xs font-mono text-neutral-300">
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span>Rule heuristics isolate known pattern markers.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>ML predicts statistical anomalies in layout structures.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span>Consensus logic explains differences and agreement metrics.</span>
                </li>
              </ul>
            </div>
            
            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl border border-cyan-500/10 bg-cyan-950/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-500/30" />
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 mb-4">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="font-bold text-sm mb-1 text-white">Heuristic Rules</h3>
                <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                  Fast, reproducible matching of specific paths, length limits, IP domains, and suspicious characters.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-emerald-500/10 bg-emerald-950/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500/30" />
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-4">
                  <Brain className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="font-bold text-sm mb-1 text-white">Random Forest ML</h3>
                <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                  Evaluates 15 structural features simultaneously to predict the probability of zero-day spoof attempts.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4 — THREAT CATEGORIES */}
        <section className="w-full border-t border-white/[0.05] py-20 bg-gradient-to-b from-transparent to-[#0a0b0d]">
          <div className="container mx-auto px-4 max-w-5xl text-center space-y-12">
            <div className="space-y-3 max-w-xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Structured Threat Classification</h2>
              <p className="text-sm text-neutral-400 font-mono">
                Classifying threats into standardized cybersecurity categories rather than vague risk levels.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { title: "Credential Theft", desc: "Suspicious login forms, account input elements, and credential harvesting paths.", border: "border-red-500/20", color: "text-[#ef4444]" },
                { title: "Brand Spoofing", desc: "Impersonation of trademarks using character masking and homoglyph combinations.", border: "border-amber-500/20", color: "text-amber-500" },
                { title: "Financial Fraud", desc: "Scam links target bank logins, credit card restores, or billing integrations.", border: "border-red-500/20", color: "text-[#ef4444]" },
                { title: "URL Obfuscation", desc: "Deceptive domain subfolders, excessive subdomains, or private IP masking.", border: "border-cyan-500/20", color: "text-cyan-400" }
              ].map((category, idx) => (
                <div key={idx} className={`p-5 rounded-xl border ${category.border} bg-[#111215]/40 text-left space-y-2`}>
                  <h3 className={`font-bold text-sm ${category.color}`}>{category.title}</h3>
                  <p className="text-[11px] text-neutral-400 font-mono leading-relaxed">{category.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 5 — ANALYTICS PREVIEW & PWA / GUEST MODE */}
        <section className="w-full border-t border-white/[0.05] py-20 bg-[#070709]">
          <div className="container mx-auto px-4 max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6 text-left">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">PWA Offline & Guest Capabilities</h2>
              <p className="text-sm text-neutral-400 font-mono leading-relaxed">
                PhishGuard was designed with high availability in mind. Install it as a standalone PWA on mobile or desktop to run analysis seamlessly in offline environments.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-0.5 shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Temporary Guest Accounts</h4>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">Scan URLs immediately without signup. History is secured in browser-local storage.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mt-0.5 shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Audit Export Options</h4>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">Produce developer-compliant reports. Save scan logs as PDF, pretty JSON, or TXT formats.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual export card mockup */}
            <div className="border border-white/10 bg-[#111215] p-5 rounded-2xl shadow-xl flex flex-col justify-between min-h-[220px]">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-mono text-neutral-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" /> Export center
                </span>
                <span className="px-2 py-0.5 rounded text-[8px] font-mono border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 uppercase font-bold">READY</span>
              </div>
              <div className="space-y-3 my-4 text-left">
                <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10 text-xs font-mono text-neutral-300">
                  <span>📄 Print-Ready Auditor PDF</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">Download <Download className="w-3 h-3" /></span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10 text-xs font-mono text-neutral-300">
                  <span>💻 Raw JSON Structure</span>
                  <span className="text-cyan-400 font-semibold flex items-center gap-1">Copy <Layers className="w-3 h-3" /></span>
                </div>
              </div>
              <p className="text-[10px] text-neutral-500 text-left font-mono">Downloads are signed with PhishGuard's cryptographic threat stamp.</p>
            </div>
          </div>
        </section>

        {/* SECTION 6 — FINAL CTA */}
        <section className="w-full border-t border-white/[0.05] bg-gradient-to-b from-transparent to-[#0a0b0d] py-20 text-center">
          <div className="container mx-auto px-4 max-w-3xl space-y-6">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Deploy Layered Defense Today</h2>
            <p className="text-sm text-neutral-400 max-w-lg mx-auto font-mono">
              Integrate ML classifications and structural heuristics to verify suspect links. Clean threat reporting in an analyst-focused platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Link 
                href="/signup" 
                className={buttonVariants({ 
                  size: "lg", 
                  className: "h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-[#070709] font-bold shadow-lg shadow-emerald-500/10 font-mono" 
                })}
              >
                Create Free Account
              </Link>
              <button 
                onClick={() => {
                  useAuthStore.getState().setGuest(true);
                  router.push('/dashboard');
                }}
                className={buttonVariants({ 
                  variant: "outline", 
                  size: "lg", 
                  className: "h-12 px-8 border-white/15 text-neutral-300 font-mono" 
                })}
              >
                Scan as Guest
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))] bg-[#0a0b0d]">
        <div className="container mx-auto px-4 max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-500">
          <p>© 2026 PhishGuard. Professional Threat Intelligence Console.</p>
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
