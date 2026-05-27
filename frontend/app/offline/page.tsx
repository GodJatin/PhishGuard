'use client';

import { WifiOff, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-emerald-950/20 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))]" />

      <Card className="max-w-md w-full border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden text-center p-6 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 via-emerald-600 to-cyan-500" />
        
        <CardHeader className="pt-6 pb-2">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
              <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 relative z-10">
                <WifiOff className="w-8 h-8 animate-bounce" />
              </div>
            </div>
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" /> Connection Terminated
          </CardTitle>
          <CardDescription className="text-xs font-mono text-muted-foreground uppercase tracking-widest pt-1">
            Network Integrity Compromised
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            PhishGuard requires an active network link to execute real-time heuristic scans, ML prediction algorithms, and Supabase audit synchronizations.
          </p>
          
          <div className="p-3 bg-white/5 border border-white/5 rounded-lg text-left text-xs font-mono text-muted-foreground/80 space-y-1">
            <div className="flex justify-between">
              <span>STATUS:</span>
              <span className="text-red-400 font-bold">OFFLINE</span>
            </div>
            <div className="flex justify-between">
              <span>PORT:</span>
              <span>HTTPS (443)</span>
            </div>
            <div className="flex justify-between">
              <span>ACTION:</span>
              <span>Re-check connection parameters</span>
            </div>
          </div>

          <Button 
            onClick={handleRetry} 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-[#070709] font-bold font-mono border-0 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.45)] transition-all h-10"
          >
            <RefreshCw className="w-4 h-4 mr-2 animate-spin-slow text-[#070709]" />
            Retry Scan Link
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
