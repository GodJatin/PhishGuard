'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { createClient } from '@/lib/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/api/axios';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { ScanResult } from '@/types/scan';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldAlert, Search, Activity, Clock, ShieldCheck, AlertTriangle, Loader2, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';

const loadingStages = [
  "Analyzing URL structure...",
  "Inspecting domain patterns...",
  "Calculating phishing indicators...",
  "Generating threat assessment..."
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const userName = user?.email?.split('@')[0] || 'User';
  
  const [url, setUrl] = useState('');
  const [scanType, setScanType] = useState('rule-based');
  const [loadingStageIdx, setLoadingStageIdx] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const queryClient = useQueryClient();

  // Progress fake loading stages
  useEffect(() => {
    let interval: any;
    if (loadingStageIdx >= 0 && loadingStageIdx < loadingStages.length - 1) {
      interval = setInterval(() => {
        setLoadingStageIdx((prev) => prev + 1);
      }, 800);
    }
    return () => clearInterval(interval);
  }, [loadingStageIdx]);

  const scanMutation = useMutation({
    mutationFn: async (targetUrl: string) => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await axios.post(
        API_ENDPOINTS.SCAN.RULE_BASED, 
        { url: targetUrl },
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`
          }
        }
      );
      return response.data as ScanResult;
    },
    onMutate: () => {
      setLoadingStageIdx(0);
      setScanResult(null);
    },
    onSuccess: (data) => {
      setScanResult(data);
      queryClient.invalidateQueries({ queryKey: ['history'] });
      toast.success('Scan complete');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to scan URL');
    }
  });

  const handleScan = () => {
    if (!url) {
      toast.error("Please enter a URL to scan");
      return;
    }
    if (scanType !== 'rule-based') {
      toast("This engine is currently under development.", { icon: '🚧' });
      return;
    }
    scanMutation.mutate(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SAFE': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'SUSPICIOUS': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'DANGEROUS': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SAFE': return <ShieldCheck className="w-6 h-6 text-green-400" />;
      case 'SUSPICIOUS': return <AlertTriangle className="w-6 h-6 text-yellow-400" />;
      case 'DANGEROUS': return <ShieldAlert className="w-6 h-6 text-red-400" />;
      default: return <Info className="w-6 h-6 text-muted-foreground" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8 relative z-10">
      
      {/* Welcome Section */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {userName}</h1>
        <p className="text-muted-foreground">
          Your centralized command center for URL threat intelligence.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scan Box UI */}
        <Card className="border-white/10 bg-black/40 backdrop-blur-xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-400" />
              Analyze URL
            </CardTitle>
            <CardDescription>
              Enter a suspicious URL below to scan it against our intelligence network.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input 
                placeholder="https://example.com/suspicious-link" 
                className="flex-1 bg-background/50 border-white/10 focus-visible:ring-blue-500/50 h-12"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={scanMutation.isPending}
              />
              <select 
                value={scanType}
                onChange={(e) => setScanType(e.target.value)}
                className="h-12 px-4 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                disabled={scanMutation.isPending}
              >
                <option value="rule-based">Rule-Based Engine</option>
                <option value="pretrained">Pretrained Model</option>
                <option value="custom">Custom AI</option>
              </select>
            </div>
            
            <Button 
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-semibold text-white" 
              onClick={handleScan}
              disabled={scanMutation.isPending}
            >
              {scanMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                'Scan Now'
              )}
            </Button>

            {scanMutation.isPending && (
              <div className="mt-4 p-4 border border-blue-500/20 bg-blue-500/5 rounded-md flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                <span className="text-sm font-medium text-blue-400 animate-pulse">
                  {loadingStages[loadingStageIdx]}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Info Box */}
        <Card className="border-white/10 bg-black/20 backdrop-blur-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Info className="w-4 h-4" />
              Engine Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex justify-between items-center">
              <span>Rule-Based:</span>
              <span className="text-green-400 font-medium">Online</span>
            </div>
            <div className="flex justify-between items-center opacity-50">
              <span>Pretrained AI:</span>
              <span>Under Dev</span>
            </div>
            <div className="flex justify-between items-center opacity-50">
              <span>Custom AI:</span>
              <span>Under Dev</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scan Results Panel */}
      {scanResult && (
        <Card className="border-white/10 bg-black/40 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader className="border-b border-white/10 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-3">
                  {getStatusIcon(scanResult.status)}
                  Threat Audit Report
                </CardTitle>
                <CardDescription className="mt-1 font-mono text-xs break-all">
                  {scanResult.scanned_url}
                </CardDescription>
              </div>
              <div className={`px-4 py-1.5 rounded-full border font-bold tracking-wide ${getStatusColor(scanResult.status)}`}>
                {scanResult.status}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Threat Score</span>
                  <span className="text-3xl font-bold">{scanResult.score}<span className="text-lg text-muted-foreground">/100</span></span>
                </div>
                {/* Score Progress Bar */}
                <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 transition-all duration-1000"
                    style={{ width: `${scanResult.score}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>0 (Safe)</span>
                  <span>100 (Dangerous)</span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Reasons Detected
                </h4>
                {scanResult.reasons.length > 0 ? (
                  <ul className="space-y-2">
                    {scanResult.reasons.map((reason, i) => (
                      <li key={i} className="text-sm p-2 rounded bg-white/5 border border-white/10 flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span className="text-foreground/90">{reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No suspicious indicators found.</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Search className="w-4 h-4 text-purple-400" />
                  Technical Details
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-white/5 rounded border border-white/5">
                    <span className="block text-xs text-muted-foreground mb-1">Domain</span>
                    <span className="font-mono truncate block" title={scanResult.technical_details.domain}>
                      {scanResult.technical_details.domain}
                    </span>
                  </div>
                  <div className="p-2 bg-white/5 rounded border border-white/5">
                    <span className="block text-xs text-muted-foreground mb-1">HTTPS</span>
                    <span className={scanResult.technical_details.https ? 'text-green-400' : 'text-red-400'}>
                      {scanResult.technical_details.https ? 'Secured' : 'Missing'}
                    </span>
                  </div>
                  <div className="p-2 bg-white/5 rounded border border-white/5">
                    <span className="block text-xs text-muted-foreground mb-1">Length</span>
                    <span>{scanResult.technical_details.url_length} chars</span>
                  </div>
                  <div className="p-2 bg-white/5 rounded border border-white/5">
                    <span className="block text-xs text-muted-foreground mb-1">Subdomains</span>
                    <span>{scanResult.technical_details.subdomain_count}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <h4 className="text-sm font-semibold text-blue-400 mb-1">Recommendation</h4>
                <p className="text-sm text-blue-100/80">{scanResult.recommendation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
