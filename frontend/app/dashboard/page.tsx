'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { createClient } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/api/axios';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { ScanResult } from '@/types/scan';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ShieldAlert, Search, Activity, Clock, ShieldCheck, 
  AlertTriangle, Loader2, Info, Brain, Cpu, TrendingUp,
  PieChart as PieIcon, BarChart3, ChevronRight, Terminal, ExternalLink,
  Target, Shield, Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar
} from 'recharts';

// Type definitions
interface OverviewStats {
  total_scans: number;
  safe_count: number;
  suspicious_count: number;
  dangerous_count: number;
  ml_scan_count: number;
  rule_based_count: number;
  average_threat_score: number;
  highest_threat_score: number;
  latest_scan_timestamp: string | null;
  total_ml_percentage: number;
  total_rule_based_percentage: number;
  insights: {
    most_common_keyword: string;
    most_detected_pattern: string;
    highest_threat_score: number;
    most_used_engine: string;
  };
}

interface TrendItem {
  date: string;
  total: number;
  safe: number;
  suspicious: number;
  dangerous: number;
}

interface KeywordStats {
  keywords: Array<{ keyword: string; count: number }>;
  indicators: Array<{ indicator: string; count: number }>;
}

interface RecentThreat {
  id: string;
  url: string;
  status: string;
  score: number;
  scan_type: string;
  created_at: string;
}

const loadingStages = [
  "Analyzing URL structure...",
  "Inspecting domain patterns...",
  "Calculating phishing indicators...",
  "Generating threat assessment..."
];

const mlLoadingStages = [
  "Extracting URL features...",
  "Running ML inference...",
  "Evaluating phishing probability...",
  "Generating threat assessment..."
];

// Performant requestAnimationFrame animated counter
const AnimatedCounter = ({ value, duration = 800 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{count.toLocaleString()}</span>;
};

// Reusable custom chart tooltip with SOC aesthetic
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 border border-white/10 p-3 rounded-lg text-xs space-y-1.5 shadow-[0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-md">
        {label && <p className="font-mono text-muted-foreground border-b border-white/5 pb-1 mb-1">{label}</p>}
        {payload.map((p: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
              <span className="text-muted-foreground">{p.name}:</span>
            </span>
            <span className="font-mono font-bold text-foreground">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const userName = user?.email?.split('@')[0] || 'User';
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [url, setUrl] = useState('');
  const [scanType, setScanType] = useState('rule-based');
  const [loadingStageIdx, setLoadingStageIdx] = useState(0);
  const [mounted, setMounted] = useState(false);

  const currentStages = scanType === 'pretrained' ? mlLoadingStages : loadingStages;

  // Prevent SSR/hydration issues with Recharts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Progress fake loading stages
  useEffect(() => {
    let interval: any;
    if (loadingStageIdx >= 0 && loadingStageIdx < currentStages.length - 1) {
      interval = setInterval(() => {
        setLoadingStageIdx((prev) => prev + 1);
      }, 800);
    }
    return () => clearInterval(interval);
  }, [loadingStageIdx, currentStages]);

  // React Query Caching for analytics data
  const { data: overview, isLoading: isOverviewLoading } = useQuery<OverviewStats>({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const response = await axios.get(API_ENDPOINTS.ANALYTICS.OVERVIEW, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      return response.data;
    }
  });

  const { data: trends, isLoading: isTrendsLoading } = useQuery<TrendItem[]>({
    queryKey: ['analytics-trends'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const response = await axios.get(API_ENDPOINTS.ANALYTICS.TRENDS, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      return response.data;
    }
  });

  const { data: keywords, isLoading: isKeywordsLoading } = useQuery<KeywordStats>({
    queryKey: ['analytics-keywords'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const response = await axios.get(API_ENDPOINTS.ANALYTICS.KEYWORDS, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      return response.data;
    }
  });

  const { data: recentThreats, isLoading: isRecentThreatsLoading } = useQuery<RecentThreat[]>({
    queryKey: ['analytics-recent-threats'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const response = await axios.get(API_ENDPOINTS.ANALYTICS.RECENT_THREATS, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      return response.data;
    }
  });

  const scanMutation = useMutation({
    mutationFn: async (targetUrl: string) => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const endpoint = scanType === 'pretrained' ? API_ENDPOINTS.SCAN.ML : API_ENDPOINTS.SCAN.RULE_BASED;
      
      const response = await axios.post(
        endpoint, 
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
    },
    onSuccess: (data) => {
      if (!data || !data.scan_id) {
        toast.error('API returned an invalid response format.');
        return;
      }
      // Invalidate all query caches to trigger dashboard updates immediately
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-trends'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-keywords'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-recent-threats'] });
      
      toast.success('Scan complete');
      router.push(`/scan/${data.scan_id}`);
    },
    onError: (error: any) => {
      if (error.response) {
        toast.error(error.response.data?.detail || 'Failed to scan URL');
      } else {
        toast.error(error.message || 'An error occurred during URL scanning');
      }
    }
  });

  const handleScan = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!url) {
      toast.error("Please enter a URL to scan");
      return;
    }
    if (scanType === 'custom') {
      toast("This engine is currently under development.", { icon: '🚧' });
      return;
    }
    scanMutation.mutate(url);
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'SAFE') return 'text-green-400 border-green-500/20 bg-green-500/10';
    if (s === 'SUSPICIOUS') return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10';
    return 'text-red-400 border-red-500/20 bg-red-500/10';
  };

  // Card Skeleton Loaders
  const CardSkeleton = () => (
    <Card className="border-white/10 bg-black/40 backdrop-blur-xl animate-pulse">
      <CardHeader className="pb-2">
        <div className="h-4 w-24 bg-white/10 rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 bg-white/10 rounded mb-2" />
        <div className="h-3 w-32 bg-white/10 rounded" />
      </CardContent>
    </Card>
  );

  // Chart Skeleton Loaders
  const ChartSkeleton = () => (
    <Card className="border-white/10 bg-black/40 backdrop-blur-xl animate-pulse h-[350px]">
      <CardHeader>
        <div className="h-5 w-40 bg-white/10 rounded mb-2" />
        <div className="h-4 w-60 bg-white/10 rounded" />
      </CardHeader>
      <CardContent className="h-[220px] flex items-end justify-between gap-4 px-8 pb-4">
        <div className="w-full bg-white/5 rounded-t h-[40%]" />
        <div className="w-full bg-white/5 rounded-t h-[75%]" />
        <div className="w-full bg-white/5 rounded-t h-[50%]" />
        <div className="w-full bg-white/5 rounded-t h-[90%]" />
      </CardContent>
    </Card>
  );

  const displayNoDataPlaceholder = () => (
    <div className="flex flex-col items-center justify-center h-[280px] text-center p-6">
      <Shield className="w-12 h-12 text-muted-foreground/30 mb-3 animate-pulse" />
      <h3 className="text-sm font-medium text-muted-foreground/80 mb-1">No Threat Intelligence Available</h3>
      <p className="text-xs text-muted-foreground/50 max-w-[240px]">
        Analyze suspicious links using the scanner above to populate metrics.
      </p>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8 relative z-10">
      
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-500 text-xs font-mono font-bold uppercase tracking-widest">
            <Terminal className="w-3.5 h-3.5" /> Security Operations Center
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome, Agent {userName}</h1>
          <p className="text-sm text-muted-foreground">
            Command panel for deep analysis and real-time threat intelligence.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Threat Database Active
        </div>
      </div>

      {/* QUICK SCAN CONSOLE */}
      <Card className="border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden group shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500"></div>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="w-4 h-4 text-blue-400 animate-pulse" />
            Threat Scanner Console
          </CardTitle>
          <CardDescription>
            Inspect suspicious URLs and extract indicators across rule systems and ML intelligence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <Input 
              placeholder="Enter suspicious link (e.g., http://login-verification-paypal.com)..." 
              className="flex-1 bg-background/50 border-white/10 focus-visible:ring-blue-500/50 h-12 text-sm font-mono"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={scanMutation.isPending}
            />
            <div className="flex gap-3">
              <select 
                value={scanType}
                onChange={(e) => setScanType(e.target.value)}
                className="h-12 px-4 rounded-lg bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs font-mono"
                disabled={scanMutation.isPending}
              >
                <option value="rule-based">🔍 Rule-Based Engine</option>
                <option value="pretrained">🤖 Pretrained ML Model</option>
                <option value="custom">🚧 Custom AI</option>
              </select>
              <Button 
                type="button"
                className="h-12 px-8 bg-blue-600 hover:bg-blue-700 font-semibold text-white transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]" 
                onClick={handleScan}
                disabled={scanMutation.isPending}
              >
                {scanMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning
                  </>
                ) : (
                  'Scan URL'
                )}
              </Button>
            </div>
          </div>

          {scanMutation.isPending && (
            <div className="p-3 border border-blue-500/20 bg-blue-500/5 rounded-lg flex items-center gap-3 animate-in fade-in duration-300">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span className="text-xs font-mono text-blue-400 animate-pulse">
                {currentStages[loadingStageIdx]}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* STAT CARDS SECTION */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {isOverviewLoading || !overview ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            {/* Total Scans */}
            <Card className="border-white/10 bg-black/40 hover:bg-black/60 backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_15px_rgba(59,130,246,0.1)] group cursor-default">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs flex items-center gap-1.5 font-medium text-muted-foreground group-hover:text-blue-400 transition-colors">
                  <Activity className="w-3.5 h-3.5 text-blue-400" /> TOTAL SCANS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight font-mono text-foreground">
                  <AnimatedCounter value={overview.total_scans} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">Aggregated history</div>
              </CardContent>
            </Card>

            {/* Dangerous */}
            <Card className="border-white/10 bg-black/40 hover:bg-black/60 backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_15px_rgba(239,68,68,0.1)] group cursor-default">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs flex items-center gap-1.5 font-medium text-muted-foreground group-hover:text-red-400 transition-colors">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500" /> DANGEROUS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight font-mono text-red-400">
                  <AnimatedCounter value={overview.dangerous_count} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">High severity threats</div>
              </CardContent>
            </Card>

            {/* Suspicious */}
            <Card className="border-white/10 bg-black/40 hover:bg-black/60 backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_15px_rgba(245,158,11,0.1)] group cursor-default">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs flex items-center gap-1.5 font-medium text-muted-foreground group-hover:text-yellow-400 transition-colors">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" /> SUSPICIOUS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight font-mono text-yellow-400">
                  <AnimatedCounter value={overview.suspicious_count} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">Medium risk warnings</div>
              </CardContent>
            </Card>

            {/* Safe */}
            <Card className="border-white/10 bg-black/40 hover:bg-black/60 backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] group cursor-default">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs flex items-center gap-1.5 font-medium text-muted-foreground group-hover:text-green-400 transition-colors">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-400" /> SAFE URLS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight font-mono text-green-400">
                  <AnimatedCounter value={overview.safe_count} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">Clean signatures</div>
              </CardContent>
            </Card>

            {/* ML Detections */}
            <Card className="border-white/10 bg-black/40 hover:bg-black/60 backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_15px_rgba(139,92,246,0.1)] group cursor-default">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs flex items-center gap-1.5 font-medium text-muted-foreground group-hover:text-purple-400 transition-colors">
                  <Brain className="w-3.5 h-3.5 text-purple-400" /> ML SCANS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight font-mono text-purple-400">
                  <AnimatedCounter value={overview.ml_scan_count} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {overview.total_ml_percentage}% usage count
                </div>
              </CardContent>
            </Card>

            {/* Rule Detections */}
            <Card className="border-white/10 bg-black/40 hover:bg-black/60 backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_15px_rgba(6,182,212,0.1)] group cursor-default">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs flex items-center gap-1.5 font-medium text-muted-foreground group-hover:text-cyan-400 transition-colors">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" /> HEURISTIC
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight font-mono text-cyan-400">
                  <AnimatedCounter value={overview.rule_based_count} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {overview.total_rule_based_percentage}% usage count
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Scan Timeline */}
        <div className="lg:col-span-2">
          {isTrendsLoading || !mounted ? (
            <ChartSkeleton />
          ) : trends && trends.length > 0 && overview && overview.total_scans > 0 ? (
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl h-[360px]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  Scan Activity Timeline
                </CardTitle>
                <CardDescription>Daily threat scanning statistics for the past 7 days.</CardDescription>
              </CardHeader>
              <CardContent className="h-[270px] w-full pr-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDangerous" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="date" stroke="#737373" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <YAxis stroke="#737373" style={{ fontSize: 10, fontFamily: 'monospace' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="total" name="Total Scans" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                    <Area type="monotone" dataKey="dangerous" name="Dangerous Scans" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDangerous)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl h-[360px]">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" /> Scan Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[270px]">
                {displayNoDataPlaceholder()}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Chart 2: Threat Distribution */}
        <div>
          {isOverviewLoading || !mounted ? (
            <ChartSkeleton />
          ) : overview && overview.total_scans > 0 ? (
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl h-[360px] flex flex-col">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-purple-400" />
                  Threat Distribution
                </CardTitle>
                <CardDescription>Visual severity breakout of URL reports.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 h-[250px] w-full flex flex-col justify-center">
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Safe', value: overview.safe_count, color: '#10b981' },
                          { name: 'Suspicious', value: overview.suspicious_count, color: '#f59e0b' },
                          { name: 'Dangerous', value: overview.dangerous_count, color: '#ef4444' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[
                          { name: 'Safe', color: '#10b981' },
                          { name: 'Suspicious', color: '#f59e0b' },
                          { name: 'Dangerous', color: '#ef4444' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 text-xs font-mono mt-1">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Safe</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Warning</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Danger</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl h-[360px]">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-purple-400" /> Threat Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[270px]">
                {displayNoDataPlaceholder()}
              </CardContent>
            </Card>
          )}
        </div>

      </div>

      {/* INSIGHTS & ENGINE BAR CHART ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Insights Panel */}
        <div className="lg:col-span-2">
          {isOverviewLoading || !overview ? (
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl h-[330px] animate-pulse">
              <CardHeader><div className="h-5 w-48 bg-white/10 rounded" /></CardHeader>
              <CardContent className="space-y-4"><div className="h-20 bg-white/5 rounded" /><div className="h-20 bg-white/5 rounded" /></CardContent>
            </Card>
          ) : (
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl h-[330px] flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
                  Threat Intelligence Insights
                </CardTitle>
                <CardDescription>Actionable heuristics derived from scanned database artifacts.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-auto">
                <div className="p-3 bg-white/5 border border-white/5 rounded-lg flex items-start gap-3">
                  <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    <Target className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] text-muted-foreground font-mono uppercase">Most Abused Keyword</span>
                    <span className="font-mono text-sm font-bold text-white truncate block capitalize">
                      {overview.insights.most_common_keyword}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white/5 border border-white/5 rounded-lg flex items-start gap-3">
                  <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] text-muted-foreground font-mono uppercase">Max Recorded Score</span>
                    <span className="font-mono text-sm font-bold text-red-400 block">
                      {overview.insights.highest_threat_score}/100
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white/5 border border-white/5 rounded-lg flex items-start gap-3">
                  <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] text-muted-foreground font-mono uppercase">Primary Engine Used</span>
                    <span className="font-mono text-sm font-bold text-white block">
                      {overview.insights.most_used_engine}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white/5 border border-white/5 rounded-lg flex items-start gap-3">
                  <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] text-muted-foreground font-mono uppercase">Top Vulnerability Trigger</span>
                    <span className="font-mono text-xs font-semibold text-white block truncate max-w-[200px]" title={overview.insights.most_detected_pattern}>
                      {overview.insights.most_detected_pattern}
                    </span>
                  </div>
                </div>
              </CardContent>
              <div className="px-6 pb-4 pt-2 border-t border-white/5 text-[10px] text-muted-foreground font-mono flex items-center justify-between">
                <span>Database Sync Time: Live</span>
                <span>Audit Logs: Enforced</span>
              </div>
            </Card>
          )}
        </div>

        {/* Engine Usage Bar Chart */}
        <div>
          {isOverviewLoading || !mounted ? (
            <ChartSkeleton />
          ) : overview && overview.total_scans > 0 ? (
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl h-[330px] flex flex-col justify-between">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  Engine Utilisation
                </CardTitle>
                <CardDescription>Rule-Based heuristics vs Model predictions.</CardDescription>
              </CardHeader>
              <CardContent className="h-[210px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={[
                      { name: 'ML Engine', count: overview.ml_scan_count, fill: '#8b5cf6' },
                      { name: 'Rule-Based', count: overview.rule_based_count, fill: '#06b6d4' }
                    ]}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="name" stroke="#737373" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <YAxis stroke="#737373" style={{ fontSize: 10, fontFamily: 'monospace' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Scans Run" radius={[4, 4, 0, 0]}>
                      <Cell fill="#8b5cf6" />
                      <Cell fill="#06b6d4" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
              <div className="px-6 pb-4 text-[10px] text-muted-foreground font-mono text-center">
                Engine comparison index based on real execution.
              </div>
            </Card>
          ) : (
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl h-[330px]">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" /> Engine Utilisation
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[240px]">
                {displayNoDataPlaceholder()}
              </CardContent>
            </Card>
          )}
        </div>

      </div>

      {/* RECENT DANGEROUS/SUSPICIOUS SCANS */}
      <Card className="border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
        <CardHeader className="border-b border-white/10 pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
            Recent Threats Detected
          </CardTitle>
          <CardDescription>Chronological ledger of medium and high-threat analyses flagged in your workspace.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 px-0 sm:px-6">
          {isRecentThreatsLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-xs text-muted-foreground font-mono">Querying threat tables...</p>
            </div>
          ) : recentThreats && recentThreats.length > 0 ? (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs sm:text-sm text-muted-foreground font-mono min-w-[600px] border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-muted-foreground/60 text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Threat Target URL</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Engine Type</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentThreats.map((threat) => (
                    <tr 
                      key={threat.id} 
                      onClick={() => router.push(`/scan/${threat.id}`)}
                      className="border-b border-white/5 hover:bg-white/5 cursor-pointer group transition-all duration-300 hover:shadow-[inset_0_0_15px_rgba(239,68,68,0.02)]"
                    >
                      <td className="py-3.5 px-4 font-medium text-foreground truncate max-w-[250px] font-mono group-hover:text-blue-400 transition-colors" title={threat.url}>
                        {threat.url}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(threat.status)}`}>
                          {threat.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        {threat.score}
                        <span className="text-[10px] text-muted-foreground">/100</span>
                      </td>
                      <td className="py-3.5 px-4 capitalize">
                        {threat.scan_type === 'ml' ? 'Pretrained AI' : 'Rule-Based'}
                      </td>
                      <td className="py-3.5 px-4 text-[10px]">
                        {new Date(threat.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1 text-xs text-blue-500 group-hover:text-blue-400 font-bold">
                          Audit <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ShieldCheck className="w-10 h-10 text-green-500/20 mb-3" />
              <h4 className="text-sm font-semibold text-muted-foreground/80 mb-1">No Active Threats Flagged</h4>
              <p className="text-xs text-muted-foreground/50 max-w-xs mx-auto">
                No URLs scanned have returned warnings or malicious classifications in your workspace history.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
