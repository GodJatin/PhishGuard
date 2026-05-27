'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { createClient } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '@/lib/api/axios';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { ScanResult } from '@/types/scan';
import Link from 'next/link';
import { safeParseJSON, safeSetJSON } from '@/lib/utils/localStorage';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ShieldAlert, Search, Activity, Clock, ShieldCheck, 
  AlertTriangle, Loader2, Info, Brain, Cpu, TrendingUp,
  PieChart as PieIcon, BarChart3, ChevronRight, Terminal, ExternalLink,
  Target, Shield, Eye, CheckCircle2
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
  threat_category_counts?: Record<string, number>;
  spoofed_brand_counts?: Record<string, number>;
  severity_tier_counts?: Record<string, number>;
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

const comparisonLoadingStages = [
  "Initializing dual-core threat scan...",
  "Querying heuristics & ML models...",
  "Correlating models and risk alignment...",
  "Generating comparative threat intelligence..."
];

export default function DashboardPage() {
  const { user, isGuest } = useAuthStore();
  const userName = user?.email?.split('@')[0] || 'User';
  const router = useRouter();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [url, setUrl] = useState('');
  const [scanType, setScanType] = useState('rule-based');
  const [isScanning, setIsScanning] = useState(false);
  const [pipelineActiveStep, setPipelineActiveStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [guestHistory, setGuestHistory] = useState<ScanResult[]>([]);
  const [scanTakingLong, setScanTakingLong] = useState(false);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // AbortController ref — cancels the in-flight scan request when user rescans or navigates away
  const abortControllerRef = useRef<AbortController | null>(null);

  // Prevent SSR/hydration issues with Recharts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch guest history from localStorage safely
  useEffect(() => {
    if (isGuest) {
      const stored = safeParseJSON<ScanResult[]>('phishguard_guest_scans', []);
      setGuestHistory(stored);
    }
  }, [isGuest]);

  // Progress pipeline steps
  useEffect(() => {
    let interval: any;
    if (isScanning) {
      interval = setInterval(() => {
        setPipelineActiveStep((prev) => {
          if (prev < 5) return prev + 1; // Cap at Consensus Core Correlation (index 5)
          return prev;
        });
      }, 400);
    } else {
      setPipelineActiveStep(0);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  // React Query Caching for analytics data
  const { data: overview, isLoading: isOverviewLoading, isError: isOverviewError } = useQuery<OverviewStats>({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const response = await axios.get(API_ENDPOINTS.ANALYTICS.OVERVIEW, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      return response.data;
    },
    enabled: !isGuest
  });

  const { data: trends, isLoading: isTrendsLoading, isError: isTrendsError } = useQuery<TrendItem[]>({
    queryKey: ['analytics-trends'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const response = await axios.get(API_ENDPOINTS.ANALYTICS.TRENDS, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      return response.data;
    },
    enabled: !isGuest
  });

  const { data: keywords, isLoading: isKeywordsLoading, isError: isKeywordsError } = useQuery<KeywordStats>({
    queryKey: ['analytics-keywords'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const response = await axios.get(API_ENDPOINTS.ANALYTICS.KEYWORDS, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      return response.data;
    },
    enabled: !isGuest
  });

  const { data: recentThreats, isLoading: isRecentThreatsLoading, isError: isRecentThreatsError } = useQuery<RecentThreat[]>({
    queryKey: ['analytics-recent-threats'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const response = await axios.get(API_ENDPOINTS.ANALYTICS.RECENT_THREATS, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      return response.data;
    },
    enabled: !isGuest
  });

  const hasConnectionError = !isGuest && (isOverviewError || isTrendsError || isKeywordsError || isRecentThreatsError);

  const scanMutation = useMutation({
    mutationFn: async (targetUrl: string) => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      let endpoint = API_ENDPOINTS.SCAN.RULE_BASED;
      if (scanType === 'pretrained') {
        endpoint = API_ENDPOINTS.SCAN.ML;
      } else if (scanType === 'comparison') {
        endpoint = API_ENDPOINTS.SCAN.COMPARISON;
      }
      
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Abort any previous in-flight scan before starting a new one
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      const response = await axios.post(
        endpoint, 
        { url: targetUrl },
        { headers, signal: controller.signal }
      );
      return response.data as ScanResult;
    },
    onMutate: () => {
      setIsScanning(true);
      setPipelineActiveStep(0);
      setScanTakingLong(false);
      // Show "taking longer than expected" message after 10s
      scanTimeoutRef.current = setTimeout(() => {
        setScanTakingLong(true);
      }, 10000);
    },
    onSuccess: (data) => {
      // Set to final completion step (Final Assessment)
      setPipelineActiveStep(6);
      
      // Delay navigation slightly so user sees the 100% check completion
      setTimeout(() => {
        setIsScanning(false);
        // Clear abort controller and long-scan timeout
        abortControllerRef.current = null;
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
          scanTimeoutRef.current = null;
        }
        setScanTakingLong(false);

        if (!data || !data.scan_id) {
          toast.error('API returned an invalid response format.');
          return;
        }
        
        if (isGuest) {
          // Read existing scans safely from localStorage
          const existingScans = safeParseJSON<ScanResult[]>('phishguard_guest_scans', []);
          const updatedScans = [data, ...existingScans].slice(0, 10); // Keep max 10
          safeSetJSON('phishguard_guest_scans', updatedScans);
          setGuestHistory(updatedScans);
          
          toast.success('Scan complete (saved locally)');
          router.push(`/scan/${data.scan_id}?guest=true`);
        } else {
          // Invalidate all query caches to trigger dashboard updates immediately
          queryClient.invalidateQueries({ queryKey: ['history'] });
          queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
          queryClient.invalidateQueries({ queryKey: ['analytics-trends'] });
          queryClient.invalidateQueries({ queryKey: ['analytics-keywords'] });
          queryClient.invalidateQueries({ queryKey: ['analytics-recent-threats'] });
          
          toast.success('Scan complete');
          router.push(`/scan/${data.scan_id}`);
        }
      }, 600);
    },
    onError: (error: any) => {
      setIsScanning(false);
      // Clear abort controller and long-scan timeout
      abortControllerRef.current = null;
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      setScanTakingLong(false);

      // Silently ignore aborted requests (user cancelled by rescanning or navigating)
      if (error?.name === 'CanceledError' || error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') {
        return;
      }

      // Use normalized error message from axios interceptor when available
      const message =
        error.userMessage ||
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'An error occurred during URL scanning';
      toast.error(message);
    }
  });

  const runSimulation = (simUrl: string, type: string) => {
    setUrl(simUrl);
    setScanType(type);
    toast.success(`Loaded simulation target. Click 'Scan URL' to execute.`);
    inputRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => inputRef.current?.focus(), 500);
  };

  const handleScan = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      toast.error("Please enter a URL to scan");
      inputRef.current?.focus();
      return;
    }
    if (trimmedUrl.length > 2048) {
      toast.error("URL is too long. Maximum 2048 characters allowed.");
      return;
    }
    if (scanType === 'custom') {
      toast("This engine is currently under development.", { icon: '🚧' });
      return;
    }
    scanMutation.mutate(trimmedUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !scanMutation.isPending) {
      handleScan();
    }
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

  // Compute guest stats on the fly — guard against empty arrays
  const computedOverview = isGuest ? {
    total_scans: guestHistory.length,
    safe_count: guestHistory.filter(s => s.status === 'SAFE').length,
    suspicious_count: guestHistory.filter(s => s.status === 'SUSPICIOUS').length,
    dangerous_count: guestHistory.filter(s => s.status === 'DANGEROUS').length,
    ml_scan_count: guestHistory.filter(s => s.scan_type === 'ml' || s.scan_type === 'comparison').length,
    rule_based_count: guestHistory.filter(s => s.scan_type === 'rule-based' || s.scan_type === 'comparison').length,
    average_threat_score: guestHistory.length > 0
      ? Math.round(guestHistory.reduce((acc, curr) => acc + (curr.score ?? 0), 0) / guestHistory.length)
      : 0,
    // Guard against Math.max of empty array returning -Infinity
    highest_threat_score: guestHistory.length > 0 ? Math.max(...guestHistory.map(s => s.score ?? 0)) : 0,
    latest_scan_timestamp: guestHistory.length > 0 ? guestHistory[0].timestamp : null,
    total_ml_percentage: guestHistory.length > 0
      ? Math.round((guestHistory.filter(s => s.scan_type === 'ml' || s.scan_type === 'comparison').length / guestHistory.length) * 100)
      : 0,
    total_rule_based_percentage: guestHistory.length > 0
      ? Math.round((guestHistory.filter(s => s.scan_type === 'rule-based' || s.scan_type === 'comparison').length / guestHistory.length) * 100)
      : 0,
    threat_category_counts: guestHistory.reduce((acc: Record<string, number>, s) => {
      const cat = s.technical_details?.threat_category || 'Generic Phishing Attempt';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {}),
    spoofed_brand_counts: guestHistory.reduce((acc: Record<string, number>, s) => {
      const brand = s.technical_details?.suspected_brand;
      if (brand) {
        const key = brand.charAt(0).toUpperCase() + brand.slice(1);
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {}),
    severity_tier_counts: guestHistory.reduce((acc: Record<string, number>, s) => {
      const sev = s.technical_details?.severity_tier || (s.score >= 85 ? 'Critical' : (s.score >= 60 ? 'High' : (s.score >= 40 ? 'Medium' : (s.score >= 20 ? 'Low' : 'Informational'))));
      acc[sev] = (acc[sev] || 0) + 1;
      return acc;
    }, {
      Informational: 0,
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0
    }),
    insights: {
      most_common_keyword: 'None',
      most_detected_pattern: 'N/A',
      highest_threat_score: guestHistory.length > 0 ? Math.max(...guestHistory.map(s => s.score ?? 0)) : 0,
      most_used_engine: guestHistory.length > 0
        ? (guestHistory.filter(s => s.scan_type === 'ml').length >= guestHistory.filter(s => s.scan_type === 'rule-based').length ? 'Pretrained AI' : 'Rule-Based')
        : 'N/A'
    }
  } : null;

  const activeOverview = isGuest ? computedOverview : overview;
  const isOverviewActiveLoading = isGuest ? false : isOverviewLoading;

  const activeRecentThreats = isGuest 
    ? guestHistory.map(h => ({
        id: h.scan_id,
        url: h.scanned_url,
        status: h.status,
        score: h.score,
        scan_type: h.scan_type,
        created_at: h.timestamp
      }))
    : recentThreats;
  const isRecentThreatsActiveLoading = isGuest ? false : isRecentThreatsLoading;

  const displayEmptyState = (title: string, description: string, buttonText: string) => (
    <div className="flex flex-col items-center justify-center h-[280px] text-center p-6 border border-dashed border-white/10 rounded-xl bg-white/[0.01] transition-all hover:bg-white/[0.02]">
      <div className="relative mb-3">
        <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl animate-pulse" />
        <Shield className="w-9 h-9 text-emerald-500/60 relative z-10" />
      </div>
      <h3 className="text-sm font-semibold text-foreground/90 mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground/60 max-w-[240px] mb-3.5">
        {description}
      </p>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => inputRef.current?.focus()}
        className="border-white/10 hover:bg-white/5 text-xs text-muted-foreground hover:text-foreground font-mono focus-visible:ring-1 focus-visible:ring-white/20 transition-all active:scale-95"
      >
        {buttonText}
      </Button>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8 relative z-10">
      
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-500 text-xs font-mono font-bold uppercase tracking-widest">
            <Terminal className="w-3.5 h-3.5" /> Security Operations Center
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {isGuest ? "Welcome, Guest Agent" : `Welcome, Agent ${userName}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isGuest 
              ? "Temporary command panel for deep analysis and threat scanning."
              : "Command panel for deep analysis and real-time threat intelligence."
            }
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Threat Database Active
        </div>
      </div>

      {hasConnectionError && (
        <div className="p-4 border border-red-500/30 bg-red-500/10 text-red-400 rounded-lg flex items-start gap-3 animate-in fade-in duration-300">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500 animate-pulse" />
          <div className="space-y-1 flex-1">
            <h4 className="text-sm font-semibold">Threat Intelligence API Connection Failure</h4>
            <p className="text-xs text-red-400/80">
              The Security Operations Center could not connect to the backend threat intelligence servers.
              Please verify that the backend API service is running locally at <code className="bg-red-500/20 px-1 rounded font-mono">http://127.0.0.1:8000</code>.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
              queryClient.invalidateQueries({ queryKey: ['analytics-trends'] });
              queryClient.invalidateQueries({ queryKey: ['analytics-keywords'] });
              queryClient.invalidateQueries({ queryKey: ['analytics-recent-threats'] });
            }}
          >
            Retry
          </Button>
        </div>
      )}


      {/* QUICK SCAN CONSOLE */}
      <Card className="border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden group shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 via-emerald-600 to-cyan-500"></div>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="w-4 h-4 text-emerald-400 animate-pulse" />
            Threat Scanner Console
          </CardTitle>
          <CardDescription>
            Inspect suspicious URLs and extract indicators across rule systems and ML intelligence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Input 
              ref={inputRef}
              placeholder="Enter suspicious link (e.g., http://login-verification-paypal.com)..." 
              className="w-full sm:flex-1 bg-background/50 border-white/10 focus-visible:ring-emerald-500/50 h-12 text-sm font-mono"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={scanMutation.isPending}
              aria-label="URL to scan"
              maxLength={2048}
            />
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <select 
                value={scanType}
                onChange={(e) => setScanType(e.target.value)}
                className="w-full sm:w-auto h-12 px-4 rounded-lg bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs font-mono"
                disabled={scanMutation.isPending}
              >
                <option value="rule-based">🔍 Rule-Based Engine</option>
                <option value="pretrained">🤖 Pretrained ML Model</option>
                <option value="comparison">⚖️ Compare Both Engines</option>
                <option value="custom">🚧 Custom AI</option>
              </select>
              <Button 
                type="button"
                className="w-full sm:w-auto h-12 px-8 bg-emerald-600 hover:bg-emerald-700 font-bold text-[#08090b] transition-all shadow-[0_0_15px_rgba(16,185,129,0.35)] active:scale-95 cursor-pointer font-mono" 
                onClick={handleScan}
                disabled={scanMutation.isPending}
              >
                {scanMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin text-[#08090b]" />
                    Scanning
                  </>
                ) : (
                  'Scan URL'
                )}
              </Button>
            </div>
          </div>

          {scanMutation.isPending && (
            <div className="p-5 border border-white/10 bg-[#111215]/80 rounded-xl space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-xs font-mono border-b border-white/5 pb-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                  <span>INTELLIGENCE SCAN PIPELINE IN PROGRESS</span>
                </div>
                <span className="text-emerald-400 font-bold">
                  {Math.round((pipelineActiveStep + 1) * 14.2)}%
                </span>
              </div>
              
              {/* Vertical Pipeline Stepper */}
              <div className="grid grid-cols-1 gap-2.5 pt-2">
                {[
                  { step: 0, label: "Whitelist Bypass Query", sub: "Checking database of pre-verified safe corporate hosts" },
                  { step: 1, label: "Blacklist Signature Verification", sub: "Matching URL tokens against 300+ known threat feeds" },
                  { step: 2, label: "Brand Spoofing Analysis", sub: "Running Levenshtein distance and character homoglyph checks" },
                  { step: 3, label: "Heuristic Structural Inspection", sub: "Scanning directory depth, query parameters, entropy, and ports" },
                  { step: 4, label: "Random Forest ML Inference", sub: "Evaluating 15 statistical layout dimensions in real-time" },
                  { step: 5, label: "Consensus Model Correlation", sub: "Resolving weight alignment between heuristic and statistical cores" },
                  { step: 6, label: "Final Assessment & Report Stamp", sub: "Mapping threat categories, confidence index, and exports" }
                ].map((s) => {
                  const isDone = pipelineActiveStep > s.step;
                  const isActive = pipelineActiveStep === s.step;
                  
                  return (
                    <div 
                      key={s.step} 
                      className={`flex items-start gap-3 p-2 rounded-lg border transition-all duration-300 ${
                        isActive ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]' : 
                        isDone ? 'bg-white/[0.01] border-transparent' : 'opacity-40 border-transparent'
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {isDone ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          </div>
                        ) : isActive ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-600 font-mono text-[9px]">
                            {s.step + 1}
                          </div>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <p className={`text-xs font-mono font-bold ${isActive ? 'text-emerald-400' : isDone ? 'text-neutral-300' : 'text-neutral-500'}`}>
                          {s.label}
                        </p>
                        {isActive && (
                          <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-[10px] text-neutral-400 font-mono leading-none mt-0.5"
                          >
                            {s.sub}
                          </motion.p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {scanTakingLong && (
                <div className="flex items-start gap-2 text-xs text-amber-500 font-mono bg-amber-500/5 border border-amber-500/20 rounded-lg px-3.5 py-2.5 mt-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mt-1 shrink-0" />
                  <span>
                    <span className="font-bold">Server is waking up.</span>
                    {' '}Render's free tier spins down database processes after inactivity. Waking threat database container (usually 20–40 seconds). Hang tight.
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* STAT CARDS SECTION */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {isOverviewActiveLoading || (!activeOverview && !hasConnectionError) ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (hasConnectionError || !activeOverview) ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-red-500/15 bg-red-950/10 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] text-red-500/60 font-mono tracking-wider font-bold">OFFLINE</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold font-mono text-red-400/80">N/A</div>
                <div className="text-[9px] text-red-400/40 mt-1">API Unreachable</div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            {/* Total Scans */}
            <Card className="border-white/10 bg-black/40 hover:bg-black/60 backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_15px_rgba(6,182,212,0.1)] group cursor-default">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs flex items-center gap-1.5 font-medium text-muted-foreground group-hover:text-cyan-400 transition-colors">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" /> TOTAL SCANS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight font-mono text-foreground">
                  <AnimatedCounter value={activeOverview.total_scans} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {isGuest ? 'Temporary local memory' : 'Aggregated history'}
                </div>
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
                  <AnimatedCounter value={activeOverview.dangerous_count} />
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
                  <AnimatedCounter value={activeOverview.suspicious_count} />
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
                  <AnimatedCounter value={activeOverview.safe_count} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">Clean signatures</div>
              </CardContent>
            </Card>

            {/* ML Detections */}
            <Card className="border-white/10 bg-black/40 hover:bg-black/60 backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] group cursor-default">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs flex items-center gap-1.5 font-medium text-muted-foreground group-hover:text-emerald-400 transition-colors">
                  <Brain className="w-3.5 h-3.5 text-emerald-400" /> ML SCANS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight font-mono text-emerald-400">
                  <AnimatedCounter value={activeOverview.ml_scan_count} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {activeOverview.total_ml_percentage}% usage count
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
                  <AnimatedCounter value={activeOverview.rule_based_count} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {activeOverview.total_rule_based_percentage}% usage count
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* CHARTS & INSIGHTS CONTAINER OR UPGRADE CARD */}
      {!isGuest ? (
        <>
          {/* CHARTS CONTAINER */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart 1: Scan Timeline */}
            <div className="lg:col-span-2">
              {isTrendsLoading || !mounted ? (
                <ChartSkeleton />
              ) : hasConnectionError ? (
                <Card className="border-red-500/15 bg-red-950/5 backdrop-blur-xl h-[360px]">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-400">
                      <TrendingUp className="w-4 h-4" /> Scan Activity Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[270px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-red-500/20 rounded-xl bg-red-950/5">
                    <AlertTriangle className="w-8 h-8 text-red-500/60 mb-2 animate-pulse" />
                    <h4 className="text-xs font-semibold text-red-400">Activity Timeline Offline</h4>
                    <p className="text-[11px] text-red-400/60 max-w-[280px] mt-1">
                      Connection to the database endpoint failed. Timeline metrics are unavailable.
                    </p>
                  </CardContent>
                </Card>
              ) : trends && trends.length > 0 && overview && overview.total_scans > 0 ? (
                <Card className="border-white/10 bg-black/40 backdrop-blur-xl h-[360px]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                      Scan Activity Timeline
                    </CardTitle>
                    <CardDescription>Daily threat scanning statistics for the past 7 days.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[270px] w-full pr-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
                        <Area type="monotone" dataKey="total" name="Total Scans" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                        <Area type="monotone" dataKey="dangerous" name="Dangerous Scans" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDangerous)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-white/10 bg-black/40 backdrop-blur-xl h-[360px]">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-cyan-400" /> Scan Activity Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[270px]">
                    {displayEmptyState("Start your first threat analysis", "Run a scan to generate timeline metrics.", "Deploy Scanner")}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Chart 2: Threat Severity Overview */}
            <div>
              {isOverviewLoading || !mounted ? (
                <ChartSkeleton />
              ) : hasConnectionError ? (
                <Card className="border-red-500/15 bg-red-950/5 backdrop-blur-xl h-[360px]">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-400">
                      <BarChart3 className="w-4 h-4" /> Threat Severity Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[270px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-red-500/20 rounded-xl bg-red-950/5">
                    <AlertTriangle className="w-8 h-8 text-red-500/60 mb-2 animate-pulse" />
                    <h4 className="text-xs font-semibold text-red-400">Severity Overview Offline</h4>
                    <p className="text-[11px] text-red-400/60 max-w-[200px] mt-1">
                      Data payload is unavailable.
                    </p>
                  </CardContent>
                </Card>
              ) : activeOverview && activeOverview.total_scans > 0 ? (
                <Card className="border-white/10 bg-black/40 backdrop-blur-xl h-[360px] flex flex-col justify-between">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-cyan-400" />
                      Threat Severity Overview
                    </CardTitle>
                    <CardDescription>Visual breakout of URL threat severity tiers.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[230px] w-full pt-4 pr-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={[
                          { name: 'Info', count: activeOverview.severity_tier_counts?.Informational || 0, fill: '#06b6d4' },
                          { name: 'Low', count: activeOverview.severity_tier_counts?.Low || 0, fill: '#10b981' },
                          { name: 'Medium', count: activeOverview.severity_tier_counts?.Medium || 0, fill: '#f59e0b' },
                          { name: 'High', count: activeOverview.severity_tier_counts?.High || 0, fill: '#f97316' },
                          { name: 'Critical', count: activeOverview.severity_tier_counts?.Critical || 0, fill: '#ef4444' }
                        ]}
                        margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                        <XAxis dataKey="name" stroke="#737373" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                        <YAxis stroke="#737373" style={{ fontSize: 10, fontFamily: 'monospace' }} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Threats" radius={[4, 4, 0, 0]}>
                          <Cell fill="#06b6d4" />
                          <Cell fill="#10b981" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#f97316" />
                          <Cell fill="#ef4444" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                  <div className="px-6 pb-4 text-[10px] text-muted-foreground font-mono text-center">
                    Unified severity metrics based on live scan data.
                  </div>
                </Card>
              ) : (
                <Card className="border-white/10 bg-black/40 backdrop-blur-xl h-[360px]">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-cyan-400" /> Threat Severity Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[270px]">
                    {displayEmptyState("Analyze threat breakout", "Run a scan to generate severity distribution.", "Deploy Scanner")}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* INSIGHTS & ENGINE BAR CHART ROW */}

          {/* INSIGHTS & ENGINE BAR CHART ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Insights Panel */}
            <div className="lg:col-span-1">
              {isOverviewLoading || (!activeOverview && !hasConnectionError) ? (
                <Card className="border-white/10 bg-black/40 backdrop-blur-xl h-[330px] animate-pulse">
                  <CardHeader><div className="h-5 w-48 bg-white/10 rounded" /></CardHeader>
                  <CardContent className="space-y-4"><div className="h-20 bg-white/5 rounded" /><div className="h-20 bg-white/5 rounded" /></CardContent>
                </Card>
              ) : (hasConnectionError || !activeOverview) ? (
                <Card className="border-red-500/15 bg-red-950/5 backdrop-blur-xl h-[330px] flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-400">
                      <Brain className="w-4 h-4" />
                      Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-red-500/20 rounded-xl bg-red-950/5">
                    <AlertTriangle className="w-8 h-8 text-red-500/60 mb-2 animate-pulse" />
                    <h4 className="text-xs font-semibold text-red-400 font-mono">Offline</h4>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-white/10 bg-black/40 backdrop-blur-xl h-[330px] flex flex-col justify-between">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Brain className="w-4 h-4 text-cyan-400 animate-pulse" />
                      Insights Summary
                    </CardTitle>
                    <CardDescription className="text-[11px]">Actionable heuristics from user ledger.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2.5 my-auto">
                    <div className="p-2 bg-white/5 border border-white/5 rounded flex items-center gap-2">
                      <div className="p-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                        <Target className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1 flex justify-between items-center text-xs">
                        <span className="text-[10px] text-muted-foreground font-mono uppercase">Top Keyword</span>
                        <span className="font-mono font-bold text-white truncate max-w-[120px] capitalize">
                          {activeOverview.insights.most_common_keyword}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 bg-white/5 border border-white/5 rounded flex items-center gap-2">
                      <div className="p-1 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1 flex justify-between items-center text-xs">
                        <span className="text-[10px] text-muted-foreground font-mono uppercase">Max Score</span>
                        <span className="font-mono font-bold text-red-400">
                          {activeOverview.insights.highest_threat_score}/100
                        </span>
                      </div>
                    </div>

                    <div className="p-2 bg-white/5 border border-white/5 rounded flex items-center gap-2">
                      <div className="p-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1 flex justify-between items-center text-xs">
                        <span className="text-[10px] text-muted-foreground font-mono uppercase">Top Engine</span>
                        <span className="font-mono font-bold text-white truncate max-w-[120px]">
                          {activeOverview.insights.most_used_engine}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 bg-white/5 border border-white/5 rounded flex items-center gap-2">
                      <div className="p-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1 flex justify-between items-center text-xs">
                        <span className="text-[10px] text-muted-foreground font-mono uppercase">Main Vector</span>
                        <span className="font-mono font-semibold text-white truncate max-w-[120px]" title={activeOverview.insights.most_detected_pattern}>
                          {activeOverview.insights.most_detected_pattern}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <div className="px-4 pb-3 pt-1.5 border-t border-white/5 text-[9px] text-muted-foreground font-mono text-center">
                    Database Feed: Live Sync
                  </div>
                </Card>
              )}
            </div>

            {/* Threat Categories & Brands Panel */}
            <div className="lg:col-span-1">
              {isOverviewLoading || (!activeOverview && !hasConnectionError) ? (
                <Card className="border-white/10 bg-black/40 backdrop-blur-xl h-[330px] animate-pulse">
                  <CardHeader><div className="h-5 w-48 bg-white/10 rounded" /></CardHeader>
                  <CardContent className="space-y-4"><div className="h-20 bg-white/5 rounded" /><div className="h-20 bg-white/5 rounded" /></CardContent>
                </Card>
              ) : (hasConnectionError || !activeOverview) ? (
                <Card className="border-red-500/15 bg-red-950/5 backdrop-blur-xl h-[330px] flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-400">
                      <Shield className="w-4 h-4" />
                      Threat Classification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-red-500/20 rounded-xl bg-red-950/5">
                    <AlertTriangle className="w-8 h-8 text-red-500/60 mb-2 animate-pulse" />
                    <h4 className="text-xs font-semibold text-red-400 font-mono">Offline</h4>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-white/10 bg-black/40 backdrop-blur-xl h-[330px] flex flex-col justify-between">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Shield className="w-4 h-4 text-cyan-400 animate-pulse" />
                      Threat Vectors & Brands
                    </CardTitle>
                    <CardDescription className="text-[11px]">Primary vectors and targets flagged.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 my-auto">
                    {/* Top Categories Badge Grid */}
                    <div className="space-y-1.5">
                      <span className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-semibold">Top Threat Categories</span>
                      {Object.entries(activeOverview.threat_category_counts || {}).length > 0 ? (
                        <div className="grid grid-cols-1 gap-1 max-h-[110px] overflow-y-auto pr-1">
                          {Object.entries(activeOverview.threat_category_counts || {})
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 3)
                            .map(([category, count]) => (
                              <div key={category} className="flex items-center justify-between p-1.5 rounded bg-white/5 border border-white/5 text-[11px] font-mono">
                                <span className="text-foreground truncate max-w-[140px]">{category}</span>
                                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                                  {count}
                                </span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60 italic block font-mono">No vectors mapped yet.</span>
                      )}
                    </div>

                    {/* Spoofed Brands tag list */}
                    <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                      <span className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-semibold">Spoofed Brand Targets</span>
                      {Object.entries(activeOverview.spoofed_brand_counts || {}).length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto">
                          {Object.entries(activeOverview.spoofed_brand_counts || {})
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 4)
                            .map(([brand, count]) => (
                              <span key={brand} className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[10px] flex items-center gap-1">
                                {brand} ({count})
                              </span>
                            ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60 italic block font-mono">No brand targets identified.</span>
                      )}
                    </div>
                  </CardContent>
                  <div className="px-4 pb-3 pt-1.5 border-t border-white/5 text-[9px] text-muted-foreground font-mono text-center">
                    Classification Priority: Enforced
                  </div>
                </Card>
              )}
            </div>

            {/* Engine Usage Bar Chart */}
            <div>
              {isOverviewLoading || !mounted ? (
                <ChartSkeleton />
              ) : hasConnectionError ? (
                <Card className="border-red-500/15 bg-red-950/5 backdrop-blur-xl h-[330px]">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-400">
                      <BarChart3 className="w-4 h-4" /> Engine Utilisation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[240px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-red-500/20 rounded-xl bg-red-950/5">
                    <AlertTriangle className="w-8 h-8 text-red-500/60 mb-2 animate-pulse" />
                    <h4 className="text-xs font-semibold text-red-400">Engine Utilisation Offline</h4>
                    <p className="text-[11px] text-red-400/60 max-w-[200px] mt-1">
                      Engine comparison index offline.
                    </p>
                  </CardContent>
                </Card>
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
                    {displayEmptyState("Compare engine statistics", "Run a scan to generate engine comparison indexes.", "Deploy Scanner")}
                  </CardContent>
                </Card>
              )}
            </div>

          </div>
        </>
      ) : (
        <Card className="border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden p-8 text-center flex flex-col items-center justify-center space-y-6 shadow-[0_0_50px_rgba(0,0,0,0.6)] rounded-xl min-h-[350px]">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-cyan-500/5 to-emerald-500/5" />
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-2xl animate-pulse" />
            <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 relative z-10">
              <ShieldAlert className="w-10 h-10" />
            </div>
          </div>
          <div className="space-y-2 max-w-lg relative z-10">
            <h3 className="text-xl font-bold tracking-tight text-white">Unlock Historical Threat Analytics</h3>
            <p className="text-sm text-muted-foreground">
              You are currently using <span className="text-amber-400 font-semibold font-mono">Guest Mode</span>.
              Your threat scans are stored only in temporary local memory, limited to 10 entries, and lack deep dashboard analytics.
            </p>
            <p className="text-xs text-muted-foreground/60 max-w-md mx-auto">
              Upgrade to a secure PhishGuard account to save your historical records, view interactive trend charts, monitor detection stats, and unlock full security dashboard features.
            </p>
          </div>
          <div className="flex gap-4 relative z-10">
            <Link href="/login">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-[#070709] font-bold font-mono shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 border-0">
                Register / Login
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* RECENT DANGEROUS/SUSPICIOUS SCANS */}
      <Card className="border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
        <CardHeader className="border-b border-white/10 pb-4 flex flex-row items-center justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
              {isGuest ? "Recent Temporary Scans" : "Recent Threats Detected"}
            </CardTitle>
            <CardDescription>
              {isGuest 
                ? "Your temporary temporary scan ledger in this session (retains up to 10 scans in browser memory)."
                : "Chronological ledger of medium and high-threat analyses flagged in your workspace."
              }
            </CardDescription>
          </div>
          {isGuest && activeRecentThreats && activeRecentThreats.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("Are you sure you want to clear your local guest scans history?")) {
                  safeSetJSON('phishguard_guest_scans', []);
                  setGuestHistory([]);
                  toast.success("Guest history cleared");
                }
              }}
              className="border-red-500/25 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs h-8 px-2.5 font-mono cursor-pointer shrink-0"
            >
              Clear Local History
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-4 px-0 sm:px-6">
          {isRecentThreatsActiveLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <p className="text-xs text-muted-foreground font-mono">Querying threat tables...</p>
            </div>
          ) : activeRecentThreats && activeRecentThreats.length > 0 ? (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs sm:text-sm text-muted-foreground font-mono border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-muted-foreground/60 text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Threat Target URL</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4 hidden md:table-cell">Engine Type</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Timestamp</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRecentThreats.map((threat) => (
                    <tr 
                      key={threat.id} 
                      onClick={() => router.push(`/scan/${threat.id}${isGuest ? '?guest=true' : ''}`)}
                      className="border-b border-white/5 hover:bg-white/5 cursor-pointer group transition-all duration-300 hover:shadow-[inset_0_0_15px_rgba(239,68,68,0.02)]"
                    >
                      <td className="py-3.5 px-4 font-medium text-foreground truncate max-w-[150px] sm:max-w-[250px] font-mono group-hover:text-emerald-400 transition-colors" title={threat.url}>
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
                      <td className="py-3.5 px-4 capitalize hidden md:table-cell">
                        {threat.scan_type === 'ml' ? 'Pretrained AI' : threat.scan_type === 'comparison' ? 'Engine Comparison' : 'Rule-Based'}
                      </td>
                      <td className="py-3.5 px-4 text-[10px] hidden sm:table-cell">
                        {new Date(threat.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1 text-xs text-emerald-500 group-hover:text-emerald-400 font-bold">
                          Audit <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-green-500/10 rounded-full blur-xl animate-pulse" />
                <ShieldCheck className="w-9 h-9 text-green-500/60 relative z-10" />
              </div>
              <h4 className="text-sm font-semibold text-foreground/90 mb-1">Start your threat monitoring</h4>
              <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto mb-4">
                Run a scan to generate threat logs and populate active alerts in this console.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => inputRef.current?.focus()}
                className="border-white/10 hover:bg-white/5 text-xs text-muted-foreground hover:text-foreground font-mono focus-visible:ring-1 focus-visible:ring-white/20 transition-all active:scale-95"
              >
                Run First Scan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
