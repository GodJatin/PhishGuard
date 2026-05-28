'use client';

import { use, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { createClient } from '@/lib/supabase';
import axios from '@/lib/api/axios';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { safeParseJSON } from '@/lib/utils/localStorage';
import { 
  ArrowLeft, ShieldCheck, AlertTriangle, ShieldAlert, Info, 
  Activity, Search, Download, Loader2, FileText, Code, FileCode, CheckCircle2,
  Brain, Cpu
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import DashboardLayout from '@/app/dashboard/layout';
import { ScanResult } from '@/types/scan';
import { motion, Variants } from 'framer-motion';

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

  return <span>{count}</span>;
};


const getSeverityConfig = (tier: string = 'Low') => {
  switch (tier.toLowerCase()) {
    case 'informational':
      return {
        bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,180,212,0.15)]',
        label: 'Informational',
        dot: 'bg-cyan-400'
      };
    case 'low':
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
        label: 'Low Severity',
        dot: 'bg-emerald-400'
      };
    case 'medium':
      return {
        bg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
        label: 'Medium Severity',
        dot: 'bg-yellow-400'
      };
    case 'high':
      return {
        bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.15)]',
        label: 'High Severity',
        dot: 'bg-orange-400'
      };
    case 'critical':
      return {
        bg: 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
        label: 'Critical Threat',
        dot: 'bg-red-400'
      };
    default:
      return {
        bg: 'bg-muted border-border text-muted-foreground',
        label: tier,
        dot: 'bg-muted-foreground'
      };
  }
};

const getConsensusExplanation = (consensus: string, diff: number) => {
  if (consensus === 'Strong Consensus') {
    return `Both engines strongly agree on the phishing likelihood of this domain. Deterministic rules match statistical anomalies at ${100 - diff}% consistency.`;
  } else if (consensus === 'Moderate Confidence') {
    return `Engines show moderate consensus (score difference: ${diff} pts). Traditional pattern heuristics are mostly aligned with the ML model's predictive variables.`;
  } else {
    return `Engines show weak consensus (score difference: ${diff} pts). ML analysis identified additional structural anomalies that bypassed traditional deterministic rules.`;
  }
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DetailedReportPage({ params }: PageProps) {
  const { id } = use(params);
  const [isExporting, setIsExporting] = useState<'pdf' | 'json' | 'txt' | null>(null);
  
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15
      }
    }
  };

  const searchParams = useSearchParams();
  const isGuestQuery = searchParams.get('guest') === 'true';
  const { isGuest: isGuestStore } = useAuthStore();
  const isGuestMode = isGuestQuery || isGuestStore;

  const [localScan, setLocalScan] = useState<ScanResult | null>(null);
  const [isLocalLoading, setIsLocalLoading] = useState(isGuestMode);

  // Load from local storage for guests safely
  useEffect(() => {
    if (isGuestMode) {
      const scans = safeParseJSON<ScanResult[]>('phishguard_guest_scans', []);
      const match = scans.find((s) => s.scan_id === id);
      if (match) {
        setLocalScan(match);
      }
      setIsLocalLoading(false);
    }
  }, [isGuestMode, id]);

  // Fetch detailed scan report using React Query (only if NOT guest)
  const { data: serverScan, isLoading: isServerLoading, isError: isServerError } = useQuery<ScanResult>({
    queryKey: ['scan', id],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await axios.get(`/scan/${id}`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });
      return response.data;
    },
    enabled: !isGuestMode,
    retry: 1,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  const scan = isGuestMode ? localScan : serverScan;
  const isLoading = isGuestMode ? isLocalLoading : isServerLoading;
  const isError = isGuestMode ? (!isLocalLoading && !localScan) : isServerError;

  const downloadReport = async (format: 'pdf' | 'json' | 'txt') => {
    setIsExporting(format);
    const toastId = toast.loading(`Preparing ${format.toUpperCase()} export...`);
    
    try {
      let response;
      if (isGuestMode) {
        // Post the raw scan payload to get the generated stream (session-less)
        response = await axios.post(`/reports/export/${format}`, scan, {
          responseType: 'blob'
        });
      } else {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        response = await axios.get(`/reports/export/${format}/${id}`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`
          },
          responseType: 'blob'
        });
      }
      
      const blob = response.data;
      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error(`Invalid or empty response data received for ${format.toUpperCase()} export.`);
      }
      
      // Determine file name from Content-Disposition header in a case-insensitive manner
      const headers = response.headers;
      const contentDisposition = headers['content-disposition'] || headers['Content-Disposition'];
      let filename = `phishguard_report_download.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = match[1].trim().replace(/['"]/g, '');
        }
      }
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Delay removal and revocation to allow browser to start/complete download
      setTimeout(() => {
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      }, 1000);
      
      toast.success(`${format.toUpperCase()} downloaded successfully`, { id: toastId });
    } catch (err: any) {
      let errorMessage: string;

      // Use normalized message from axios interceptor when available
      if (err.userMessage) {
        errorMessage = err.userMessage;
      } else if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          errorMessage = parsed?.detail || parsed?.message || `Export failed with status ${err.response.status}`;
        } catch {
          if (err.response?.status === 403) {
            errorMessage = 'Access denied. You do not own this scan report.';
          } else if (err.response?.status === 404) {
            errorMessage = 'Scan report not found. It may have been deleted.';
          } else {
            errorMessage = `Export failed: Server returned status code ${err.response.status}`;
          }
        }
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      } else {
        errorMessage = `Export failed. Please try again.`;
      }

      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsExporting(null);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SAFE':
        return {
          bannerBg: 'bg-green-500/10 border-green-500/30 text-green-400',
          icon: <ShieldCheck className="w-5 h-5 text-green-400" />,
          accentColor: 'text-green-400',
          borderColor: 'border-green-500/20',
          statusText: 'Audit Passed: Safe',
          explanation: 'No phishing signatures or suspicious structures matching malicious tactics were identified in this URL.'
        };
      case 'SUSPICIOUS':
        return {
          bannerBg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
          icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
          accentColor: 'text-yellow-400',
          borderColor: 'border-yellow-500/20',
          statusText: 'Security Warning: Suspicious',
          explanation: 'Mild anomalies or potential spoofing structures were triggered. Proceed with extreme caution.'
        };
      case 'DANGEROUS':
        return {
          bannerBg: 'bg-red-500/10 border-red-500/30 text-red-400',
          icon: <ShieldAlert className="w-5 h-5 text-red-400" />,
          accentColor: 'text-red-400',
          borderColor: 'border-red-500/20',
          statusText: 'Critical Threat: Dangerous',
          explanation: 'Phishing patterns, character masking, or dangerous domain matches were confirmed. Access is strictly discouraged.'
        };
      default:
        return {
          bannerBg: 'bg-muted border-border text-muted-foreground',
          icon: <Info className="w-5 h-5 text-muted-foreground" />,
          accentColor: 'text-muted-foreground',
          borderColor: 'border-border',
          statusText: 'Audit Incomplete',
          explanation: 'Insufficient details available.'
        };
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'SAFE') return 'text-green-400 border-green-500/20 bg-green-500/10';
    if (s === 'SUSPICIOUS') return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10';
    return 'text-red-400 border-red-500/20 bg-red-500/10';
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6 relative z-10 animate-pulse">
          <div className="h-5 w-32 bg-white/5 rounded" />
          <div className="h-12 w-full bg-white/5 rounded-lg" />
          <div className="h-16 w-full bg-white/5 rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-[220px] bg-white/5 rounded-lg border border-white/10" />
              <div className="h-[250px] bg-white/5 rounded-lg border border-white/10" />
            </div>
            <div className="space-y-6">
              <div className="h-[300px] bg-white/5 rounded-lg border border-white/10" />
              <div className="h-[150px] bg-white/5 rounded-lg border border-white/10" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !scan) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-16 max-w-md space-y-6 relative z-10 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold">Report Load Failed</h1>
          <p className="text-muted-foreground text-sm">
            We couldn't retrieve the details for this scan. The scan ID may be invalid, deleted, or you might not have permission to view it in this session.
          </p>
          <Link href={isGuestMode ? "/dashboard" : "/history"}>
            <Button variant="outline" className="border-white/10 hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const statusCfg = getStatusConfig(scan.status);

  return (
    <DashboardLayout>
      <motion.div 
        className="container mx-auto px-4 py-8 max-w-5xl space-y-6 relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        
        {/* Back Link & Title */}
        <motion.div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" variants={itemVariants}>
          <div className="space-y-1">
            <Link 
              href={isGuestMode ? "/dashboard" : "/history"} 
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              {isGuestMode ? "Back to Dashboard" : "Back to History"}
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Security Audit Detail</h1>
              {isGuestMode && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 uppercase tracking-widest font-mono">
                  Guest Mode
                </span>
              )}
            </div>
          </div>
          
          {/* Export Action Center */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-white/5 border border-white/10 p-1.5 rounded-lg">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => downloadReport('pdf')} 
              disabled={isExporting !== null}
              className="text-xs text-muted-foreground hover:text-white"
            >
              {isExporting === 'pdf' ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5 mr-1 text-red-400" />
              )}
              PDF
            </Button>
            <span className="h-4 w-px bg-white/10" />
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => downloadReport('json')} 
              disabled={isExporting !== null}
              className="text-xs text-muted-foreground hover:text-white"
            >
              {isExporting === 'json' ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Code className="w-3.5 h-3.5 mr-1 text-cyan-400" />
              )}
              JSON
            </Button>
            <span className="h-4 w-px bg-white/10" />
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => downloadReport('txt')} 
              disabled={isExporting !== null}
              className="text-xs text-muted-foreground hover:text-white"
            >
              {isExporting === 'txt' ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <FileCode className="w-3.5 h-3.5 mr-1 text-yellow-400" />
              )}
              TXT
            </Button>
          </div>
        </motion.div>

        {/* 1. Threat Severity & Category Header */}
        <motion.div className={`p-5 rounded-lg border ${statusCfg.bannerBg} backdrop-blur-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg`} variants={itemVariants}>
          {/* Subtle background element */}
          <div className="absolute right-0 top-0 w-24 h-24 bg-white/[0.02] rounded-full -mr-8 -mt-8 pointer-events-none" />
          
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex-shrink-0 mt-1">
              {statusCfg.icon}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight">
                  {statusCfg.statusText}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getSeverityConfig(scan.technical_details?.severity_tier || (scan.score >= 80 ? 'Critical' : (scan.score >= 60 ? 'High' : (scan.score >= 40 ? 'Medium' : (scan.score >= 20 ? 'Low' : 'Informational'))))).bg}`}>
                  {scan.technical_details?.severity_tier || (scan.score >= 80 ? 'Critical' : (scan.score >= 60 ? 'High' : (scan.score >= 40 ? 'Medium' : (scan.score >= 20 ? 'Low' : 'Informational'))))}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-mono">
                Primary Classification: <span className="underline font-bold text-white">{scan.technical_details?.threat_category || (scan.status.toUpperCase() === 'SAFE' ? 'Safe Domain' : 'Generic Phishing Attempt')}</span>
              </p>
              <p className="text-xs opacity-80 leading-relaxed max-w-2xl">
                {statusCfg.explanation}
              </p>
            </div>
          </div>
          
          {/* Secondary indicators */}
          {scan.technical_details?.secondary_threat_tags && scan.technical_details.secondary_threat_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 md:max-w-[40%] justify-start md:justify-end self-start md:self-center">
              {scan.technical_details.secondary_threat_tags.map((tag: string, i: number) => (
                <span key={i} className="px-2 py-0.5 text-[10px] font-semibold rounded bg-white/5 border border-white/10 text-muted-foreground font-mono">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* 2. Scan Metadata Row */}
        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/5 border border-white/10 rounded-lg text-xs sm:text-sm" variants={itemVariants}>
          <div className="min-w-0">
            <span className="block text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Scan ID</span>
            <span className="font-mono block truncate" title={scan.scan_id}>{scan.scan_id}</span>
          </div>
          <div className="min-w-0">
            <span className="block text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Domain</span>
            <span className="font-mono block truncate" title={scan.technical_details.domain}>{scan.technical_details.domain || 'N/A'}</span>
          </div>
          <div>
            <span className="block text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Engine Type</span>
            <span className="capitalize">{scan.scan_type === 'ml' ? 'Pretrained ML' : scan.scan_type === 'comparison' ? 'Engine Comparison' : scan.scan_type}</span>
          </div>
          <div>
            <span className="block text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Scan Time</span>
            <span className="block truncate">{new Date(scan.timestamp).toLocaleString()}</span>
          </div>
        </motion.div>

        {/* Threat Intelligence Alert Panels (Phase 9) */}
        {(scan.technical_details.is_whitelisted || scan.technical_details.is_blacklisted || scan.technical_details.brand_spoof_detected) && (
          <motion.div className="grid grid-cols-1 gap-4" variants={itemVariants}>
            {scan.technical_details.is_whitelisted && (
              <div className="flex items-start gap-3 p-4 rounded-lg border border-green-500/30 bg-green-500/10 text-green-300">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-bold text-xs uppercase tracking-wider font-mono">Verified Safe Domain (Whitelist)</h4>
                  <p className="text-sm font-mono text-green-100/90">{scan.technical_details.whitelist_reason}</p>
                </div>
              </div>
            )}
            {scan.technical_details.is_blacklisted && (
              <div className="flex items-start gap-3 p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300">
                <ShieldAlert className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-bold text-xs uppercase tracking-wider font-mono">Known Malicious Domain (Blacklist)</h4>
                  <p className="text-sm font-mono text-red-100/90">
                    Source: <span className="font-bold">{scan.technical_details.blacklist_source}</span>
                  </p>
                  {scan.technical_details.intelligence_flags && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {scan.technical_details.intelligence_flags.map((flag, i) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] rounded bg-red-950/60 border border-red-500/30 text-red-400 font-mono">
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {scan.technical_details.brand_spoof_detected && (
              <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-300">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-bold text-xs uppercase tracking-wider font-mono">Brand Spoof / Deceptive Domain Detected</h4>
                  <p className="text-sm font-mono text-yellow-100/90">{scan.technical_details.spoof_explanation}</p>
                  <div className="pt-2 flex items-center gap-4 text-xs font-mono uppercase font-bold text-yellow-400">
                    <span>Impersonated: {scan.technical_details.suspected_brand}</span>
                    <span>Spoof Type: {scan.technical_details.spoof_type}</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Subject URL Widget */}
        <motion.div className="border border-white/10 bg-black/40 backdrop-blur-xl rounded-xl" variants={itemVariants}>
          <CardHeader className="py-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Audit Subject URL
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5 pt-0">
            <p className="font-mono text-sm break-all bg-white/5 p-3 rounded border border-white/15 text-foreground leading-relaxed select-all">
              {scan.scanned_url}
            </p>
          </CardContent>
        </motion.div>

        {/* 3. Render Custom Comparison View or Standard View */}
        {scan.scan_type === 'comparison' ? (
          <div className="space-y-6">
            {/* Why This Matters Educational Insight Block */}
            {scan.technical_details?.educational_insight && (
              <motion.div className="p-5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm space-y-3 flex items-start gap-4 shadow-[0_0_20px_rgba(16,185,129,0.05)]" variants={itemVariants}>
                <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-1 flex-shrink-0">
                  <Brain className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">
                      Threat Intel Assessment: {scan.technical_details?.threat_category || 'Generic Phishing'}
                    </h4>
                    {scan.technical_details?.secondary_threat_tags && scan.technical_details.secondary_threat_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {scan.technical_details.secondary_threat_tags.map((tag: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 text-[9px] rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-emerald-200">Why This Matters:</h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-emerald-100/90 font-mono">
                    {scan.technical_details.educational_insight}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Side-by-Side scoreboard card headers */}
            <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={itemVariants}>
              {/* Heuristics Card */}
              <div className="border border-white/10 bg-black/40 backdrop-blur-xl rounded-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-500" />
                <CardHeader className="py-4">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Heuristic Rules Engine
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-5 pt-0 text-center space-y-2">
                  <div className="text-5xl font-extrabold tracking-tight">
                    <AnimatedCounter value={scan.technical_details.rule_based_result?.score || 0} />
                    <span className="text-xl text-muted-foreground font-normal">/100</span>
                  </div>
                  <span className={`px-2.5 py-0.5 inline-flex rounded-full text-[10px] font-bold border ${getStatusBadge(scan.technical_details.rule_based_result?.status || 'SAFE')}`}>
                    {scan.technical_details.rule_based_result?.status?.toUpperCase()}
                  </span>
                  <p className="text-[10px] text-muted-foreground font-mono">Deterministic pattern matching</p>
                </CardContent>
              </div>

              {/* ML Card */}
              <div className="border border-white/10 bg-black/40 backdrop-blur-xl rounded-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500" />
                <CardHeader className="py-4">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-emerald-400" /> ML Detection Engine
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-5 pt-0 text-center space-y-2">
                  <div className="text-5xl font-extrabold tracking-tight">
                    <AnimatedCounter value={scan.technical_details.ml_result?.score || 0} />
                    <span className="text-xl text-muted-foreground font-normal">/100</span>
                  </div>
                  <div className="space-x-2">
                    <span className={`px-2.5 py-0.5 inline-flex rounded-full text-[10px] font-bold border ${getStatusBadge(scan.technical_details.ml_result?.status || 'SAFE')}`}>
                      {scan.technical_details.ml_result?.status?.toUpperCase()}
                    </span>
                    {scan.technical_details.ml_result?.confidence !== undefined && (
                      <span className="px-2 py-0.5 inline-flex items-center rounded-full text-[10px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                        Conf: {((scan.technical_details.ml_result.confidence) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono">Statistical random forest model</p>
                </CardContent>
              </div>
            </motion.div>

            {/* Unified risk correlation explanation */}
            <motion.div className="p-5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm space-y-3 flex items-start gap-4 shadow-[0_0_20px_rgba(16,185,129,0.05)]" variants={itemVariants}>
              <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-1 flex-shrink-0">
                <Info className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">
                  Unified Risk Correlation & Consensus Assessment
                </h4>
                <p className="text-sm font-bold text-white font-mono">
                  Consensus State: {scan.technical_details?.consensus_level || 'Moderate Confidence'}
                </p>
                <p className="text-xs text-emerald-100/90 leading-relaxed font-mono">
                  {getConsensusExplanation(scan.technical_details?.consensus_level || 'Moderate Confidence', scan.technical_details?.score_difference || 0)}
                </p>
                <p className="text-xs leading-relaxed text-emerald-200/90 font-mono pt-1">
                  💡 Recommendation: {scan.recommendation}
                </p>
                <div className="pt-2 text-[10px] text-emerald-300 flex flex-wrap gap-x-4 gap-y-1 font-mono uppercase font-bold tracking-wider border-t border-emerald-500/10 mt-2">
                  <span>Score difference: {scan.technical_details?.score_difference || 0} points</span>
                  <span>Unified Risk Status: {scan.status}</span>
                </div>
              </div>
            </motion.div>

            {/* Scan Journey Timeline */}
            {scan.technical_details?.scan_journey && (
              <motion.div className="border border-white/10 bg-black/40 backdrop-blur-xl rounded-xl" variants={itemVariants}>
                <CardHeader className="py-4 border-b border-white/5">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Progressive Scan Journey Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pb-6">
                  <div className="relative pl-6 ml-3 space-y-6">
                    <motion.div 
                      className="absolute left-0 top-2 bottom-2 w-px bg-white/10 origin-top"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                    />
                    {scan.technical_details.scan_journey.map((step: any, idx: number) => {
                      let icon = <Info className="w-4 h-4 text-cyan-400" />;
                      let colorClass = "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
                      
                      if (step.status === 'passed') {
                        icon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
                        colorClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                      } else if (step.status === 'triggered' || step.status === 'critical') {
                        icon = <ShieldAlert className="w-4 h-4 text-red-400" />;
                        colorClass = "text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.15)]";
                      } else if (step.status === 'warning') {
                        icon = <AlertTriangle className="w-4 h-4 text-amber-400" />;
                        colorClass = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                      } else if (step.status === 'informational') {
                        icon = <Info className="w-4 h-4 text-cyan-400" />;
                        colorClass = "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
                      }

                      return (
                        <div key={idx} className="relative group transition-all duration-300">
                          {/* Timeline Node Icon */}
                          <motion.div 
                            className={`absolute -left-[35px] top-0.5 rounded-full p-1 border flex items-center justify-center ${colorClass}`}
                            initial={{ scale: 0, rotate: -30 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', delay: idx * 0.05 + 0.2, stiffness: 200 }}
                          >
                            {icon}
                          </motion.div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-foreground/90 font-mono">
                                {step.stage}
                              </h4>
                              <span className={`text-[9px] uppercase tracking-wider font-mono font-bold px-1.5 py-0.5 rounded ${
                                step.status === 'passed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
                                (step.status === 'triggered' || step.status === 'critical') ? 'bg-red-500/10 text-red-400 border border-red-500/15' :
                                step.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' :
                                'bg-cyan-500/10 text-cyan-400 border border-cyan-500/15'
                              }`}>
                                {step.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {step.message}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </motion.div>
            )}

            {/* Cross-engine threat indicator checklist */}
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
              <CardHeader className="py-4 border-b border-white/5">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cross-Engine Threat Indicator Alignment
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-5 text-xs sm:text-sm">
                <div className="space-y-1.5">
                  <span className="block text-muted-foreground text-xs uppercase tracking-wider font-semibold">Shared Indicators (Flagged by both engines)</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {scan.technical_details.shared_indicators && scan.technical_details.shared_indicators.length > 0 ? (
                      scan.technical_details.shared_indicators.map((ind: string, i: number) => (
                        <span key={i} className="px-2.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-mono text-xs font-bold uppercase">
                          {ind}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground/60 italic text-xs">No overlapping indicators detected between heuristics and model predictions.</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-1.5">
                    <span className="block text-muted-foreground text-xs uppercase tracking-wider font-semibold">Heuristics Only Indicators</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {scan.technical_details.unique_findings?.rule_based && scan.technical_details.unique_findings.rule_based.length > 0 ? (
                        scan.technical_details.unique_findings.rule_based.map((ind: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-xs">
                            {ind}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground/60 italic text-xs">No unique heuristic indicators.</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="block text-muted-foreground text-xs uppercase tracking-wider font-semibold">ML Model Only Features</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {scan.technical_details.unique_findings?.ml && scan.technical_details.unique_findings.ml.length > 0 ? (
                        scan.technical_details.unique_findings.ml.map((ind: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs">
                            {ind}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground/60 italic text-xs">No unique ML features flagged.</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ML Feature Importance and Model Explainability Panel (Phase 9) */}
            {scan.technical_details.feature_importances && scan.technical_details.feature_importances.length > 0 && (
              <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                <CardHeader className="border-b border-white/10 py-4">
                  <CardTitle className="text-xs font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                    <Brain className="w-4 h-4 text-emerald-400 animate-pulse" />
                    Machine Learning Model Feature Importance
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground/70">
                    Calculated feature contribution percentages to this specific classification.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  {scan.technical_details.feature_importances.map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs sm:text-sm">
                        <span className="text-foreground/90 font-medium font-mono flex items-center gap-2">
                          <span className={item.is_active ? "text-emerald-400 font-bold" : "text-muted-foreground/50"}>•</span>
                          {item.label}
                          {item.is_active && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 uppercase tracking-widest">
                              Triggered
                            </span>
                          )}
                        </span>
                        <span className="font-bold font-mono text-emerald-400">
                          {item.contribution_pct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${item.is_active ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 animate-pulse' : 'bg-emerald-950/40'}`}
                          style={{ width: `${item.contribution_pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  
                  {scan.technical_details.ml_interpretation && (
                    <div className="mt-4 p-3 rounded bg-emerald-500/5 border border-emerald-500/15 text-xs text-emerald-300 font-mono italic">
                      💡 ML Interpretation: "{scan.technical_details.ml_interpretation}"
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Ledgers side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-white/10 bg-black/40 backdrop-blur-xl">

                <CardHeader className="py-3 border-b border-white/5">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Heuristic Rules Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2.5">
                  {scan.technical_details.rule_based_result?.reasons && scan.technical_details.rule_based_result.reasons.length > 0 ? (
                    scan.technical_details.rule_based_result.reasons.map((r: string, i: number) => (
                      <div key={i} className="p-2.5 rounded bg-cyan-500/5 border border-cyan-500/10 text-xs text-foreground/90 font-mono">
                        • {r}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic">No heuristic violations matched.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                <CardHeader className="py-3 border-b border-white/5">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    ML Model Anomaly Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2.5">
                  {scan.technical_details.ml_result?.reasons && scan.technical_details.ml_result.reasons.length > 0 ? (
                    scan.technical_details.ml_result.reasons.map((r: string, i: number) => (
                      <div key={i} className="p-2.5 rounded bg-emerald-500/5 border border-emerald-500/10 text-xs text-foreground/90 font-mono">
                        • {r}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic">No statistical anomalies flagged.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Explainable Scoring breakdown card */}
            {scan.technical_details.scoring_breakdown && scan.technical_details.scoring_breakdown.length > 0 && (
              <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                <CardHeader className="border-b border-white/10 py-4">
                  <CardTitle className="text-xs font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                    <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                    Weighted Scoring Points Breakdown (Rule Heuristics)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground/70">
                    Transparency breakdown showing points assigned by deterministic rules.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  {scan.technical_details.scoring_breakdown.map((item: any, idx: number) => {
                    const isPositive = item.points >= 0;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs sm:text-sm">
                          <span className="text-foreground/90 font-medium font-mono flex items-center gap-2">
                            <span className={isPositive ? "text-red-400" : "text-green-400"}>•</span>
                            {item.rule}
                          </span>
                          <span className={`font-bold font-mono ${isPositive ? "text-red-400" : "text-green-400"}`}>
                            {isPositive ? '+' : ''}{item.points} pts
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${isPositive ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(Math.abs(item.points) * 2.5, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Technical details grid */}
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
              <CardHeader className="py-4 border-b border-white/5">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-emerald-400" />
                  Technical Features Audit
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs sm:text-sm font-mono">
                  <div className="flex justify-between p-2.5 rounded bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                    <span className="text-muted-foreground">HTTPS Security</span>
                    <span className={`font-medium ${scan.technical_details.https ? 'text-green-400 animate-pulse' : 'text-red-400 font-bold'}`}>
                      {scan.technical_details.https ? 'Active (HTTPS)' : 'Missing (HTTP)'}
                    </span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                    <span className="text-muted-foreground">URL Length</span>
                    <span>{scan.technical_details.url_length} chars</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                    <span className="text-muted-foreground">Subdomains Count</span>
                    <span>{scan.technical_details.subdomain_count}</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                    <span className="text-muted-foreground">Contains IP Host</span>
                    <span className={scan.technical_details.contains_ip ? 'text-red-400 font-bold' : ''}>
                      {scan.technical_details.contains_ip ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                    <span className="text-muted-foreground">Suspicious TLD</span>
                    <span className={scan.technical_details.suspicious_tld ? 'text-red-400 font-bold' : ''}>
                      {scan.technical_details.suspicious_tld ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {scan.technical_details.path_depth !== undefined && scan.technical_details.path_depth !== null && (
                    <div className="flex justify-between p-2.5 rounded bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                      <span className="text-muted-foreground">Path Depth</span>
                      <span>{scan.technical_details.path_depth}</span>
                    </div>
                  )}
                  {scan.technical_details.query_parameter_count !== undefined && scan.technical_details.query_parameter_count !== null && (
                    <div className="flex justify-between p-2.5 rounded bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                      <span className="text-muted-foreground">Query Parameters</span>
                      <span>{scan.technical_details.query_parameter_count}</span>
                    </div>
                  )}
                  {scan.technical_details.entropy_score !== undefined && scan.technical_details.entropy_score !== null && (
                    <div className="flex justify-between p-2.5 rounded bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                      <span className="text-muted-foreground">URL Entropy</span>
                      <span>{scan.technical_details.entropy_score.toFixed(3)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Standard Scan Result Layout */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Why This Matters Educational Insight Block */}
              {scan.technical_details?.educational_insight && (
                <motion.div className="p-5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm space-y-3 flex items-start gap-4 shadow-[0_0_20px_rgba(16,185,129,0.05)]" variants={itemVariants}>
                  <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-1 flex-shrink-0">
                    <Brain className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">
                        Threat Intel Assessment: {scan.technical_details?.threat_category || 'Generic Phishing'}
                      </h4>
                      {scan.technical_details?.secondary_threat_tags && scan.technical_details.secondary_threat_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {scan.technical_details.secondary_threat_tags.map((tag: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 text-[9px] rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-emerald-200">Why This Matters:</h3>
                    <p className="text-xs sm:text-sm leading-relaxed text-emerald-100/90 font-mono">
                      {scan.technical_details.educational_insight}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Scan Journey Timeline */}
              {scan.technical_details?.scan_journey && (
                <motion.div className="border border-white/10 bg-black/40 backdrop-blur-xl rounded-xl" variants={itemVariants}>
                  <CardHeader className="py-4 border-b border-white/5">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-400" />
                      Progressive Scan Journey Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 pb-6">
                    <div className="relative pl-6 ml-3 space-y-6">
                      <motion.div 
                        className="absolute left-0 top-2 bottom-2 w-px bg-white/10 origin-top"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                      />
                      {scan.technical_details.scan_journey.map((step: any, idx: number) => {
                        let icon = <Info className="w-4 h-4 text-cyan-400" />;
                        let colorClass = "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
                        
                        if (step.status === 'passed') {
                          icon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
                          colorClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                        } else if (step.status === 'triggered' || step.status === 'critical') {
                          icon = <ShieldAlert className="w-4 h-4 text-red-400" />;
                          colorClass = "text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.15)]";
                        } else if (step.status === 'warning') {
                          icon = <AlertTriangle className="w-4 h-4 text-amber-400" />;
                          colorClass = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                        } else if (step.status === 'informational') {
                          icon = <Info className="w-4 h-4 text-blue-400" />;
                          colorClass = "text-blue-400 bg-blue-500/10 border-blue-500/20";
                        }

                        return (
                          <div key={idx} className="relative group transition-all duration-300">
                            {/* Timeline Node Icon */}
                            <motion.div 
                              className={`absolute -left-[35px] top-0.5 rounded-full p-1 border flex items-center justify-center ${colorClass}`}
                              initial={{ scale: 0, rotate: -30 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: 'spring', delay: idx * 0.05 + 0.2, stiffness: 200 }}
                            >
                              {icon}
                            </motion.div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-foreground/90 font-mono">
                                  {step.stage}
                                </h4>
                                <span className={`text-[9px] uppercase tracking-wider font-mono font-bold px-1.5 py-0.5 rounded ${
                                  step.status === 'passed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
                                  (step.status === 'triggered' || step.status === 'critical') ? 'bg-red-500/10 text-red-400 border border-red-500/15' :
                                  step.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' :
                                  'bg-blue-500/10 text-blue-400 border border-blue-500/15'
                                }`}>
                                  {step.status}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {step.message}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </motion.div>
              )}
              
              {/* Findings Panel */}
              <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                <CardHeader className="border-b border-white/10 py-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                    <Activity className="w-4.5 h-4.5 text-blue-400" />
                    Analysis Findings
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-3">
                  {scan.reasons.length > 0 ? (
                    <div className="space-y-2">
                      {scan.reasons.map((reason, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/5 border border-red-500/10 font-mono">
                          <span className="text-red-500 font-bold leading-none mt-0.5">•</span>
                          <p className="text-xs sm:text-sm text-foreground/90 leading-normal">{reason}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <p className="text-sm text-green-200/90 font-medium">
                        All security rules satisfied. No phishing matching markers detected.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Explainable Scoring breakdown card */}
              {scan.technical_details.scoring_breakdown && scan.technical_details.scoring_breakdown.length > 0 && (
                <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                  <CardHeader className="border-b border-white/10 py-4">
                    <CardTitle className="text-xs font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                      <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                      Weighted Threat Scoring Points Breakdown
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground/70">
                      Transparency breakdown showing points assigned for flagged threat factors.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-4">
                    {scan.technical_details.scoring_breakdown.map((item: any, idx: number) => {
                      const isPositive = item.points >= 0;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs sm:text-sm">
                            <span className="text-foreground/90 font-medium font-mono flex items-center gap-2">
                              <span className={isPositive ? "text-red-400" : "text-green-400"}>•</span>
                              {item.rule}
                            </span>
                            <span className={`font-bold font-mono ${isPositive ? "text-red-400" : "text-green-400"}`}>
                              {isPositive ? '+' : ''}{item.points} pts
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isPositive ? 'bg-red-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(Math.abs(item.points) * 2.5, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* ML Feature Importance and Model Explainability Panel (Phase 9) */}
              {scan.technical_details.feature_importances && scan.technical_details.feature_importances.length > 0 && (
                <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                  <CardHeader className="border-b border-white/10 py-4">
                    <CardTitle className="text-xs font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                      <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
                      Machine Learning Model Feature Importance
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground/70">
                      Calculated feature contribution percentages to this specific classification.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-4">
                    {scan.technical_details.feature_importances.map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs sm:text-sm">
                          <span className="text-foreground/90 font-medium font-mono flex items-center gap-2">
                            <span className={item.is_active ? "text-purple-400 font-bold" : "text-muted-foreground/50"}>•</span>
                            {item.label}
                            {item.is_active && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold border border-purple-500/20 bg-purple-500/10 text-purple-400 uppercase tracking-widest">
                                Triggered
                              </span>
                            )}
                          </span>
                          <span className="font-bold font-mono text-purple-400">
                            {item.contribution_pct}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${item.is_active ? 'bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse' : 'bg-purple-900/60'}`}
                            style={{ width: `${item.contribution_pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    
                    {scan.technical_details.ml_interpretation && (
                      <div className="mt-4 p-3 rounded bg-purple-500/5 border border-purple-500/15 text-xs text-purple-300 font-mono italic">
                        💡 ML Interpretation: "{scan.technical_details.ml_interpretation}"
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar Column */}
            <div className="space-y-6">

              
              {/* Score Summary Panel */}
              <motion.div className={`border border-white/10 bg-black/40 backdrop-blur-xl transition-all duration-500 rounded-xl ${
                scan.status.toUpperCase() === 'SAFE' ? 'shadow-[0_0_25px_rgba(16,185,129,0.06)]' :
                scan.status.toUpperCase() === 'SUSPICIOUS' ? 'shadow-[0_0_25px_rgba(245,158,11,0.08)]' :
                'shadow-[0_0_25px_rgba(239,68,68,0.12)]'
              }`} variants={itemVariants}>
                <CardHeader className="py-4">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Threat score
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-5 pt-0 text-center">
                  <div className="mb-4">
                    <div className="text-5xl font-extrabold tracking-tight">
                      <AnimatedCounter value={scan.score || 0} />
                      <span className="text-xl text-muted-foreground font-normal">/100</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 uppercase font-semibold tracking-wider">
                      Calculated Threat Index
                    </p>
                    {scan.confidence !== undefined && scan.confidence !== null && (
                      <div className="mt-3 px-3 py-1 inline-flex items-center gap-1.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Model Confidence: {(scan.confidence * 100).toFixed(1)}%
                      </div>
                    )}
                    {scan.technical_details?.consensus_level && (
                      <div className="mt-2 px-3 py-1 inline-flex items-center gap-1.5 rounded-full text-xs font-medium bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        Consensus: {scan.technical_details.consensus_level}
                      </div>
                    )}
                  </div>
                  
                  {/* Score Bar */}
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden mb-3">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 transition-all duration-1000"
                      style={{ width: `${scan.score}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>0 (SAFE)</span>
                    <span>100 (DANGEROUS)</span>
                  </div>
                </CardContent>
              </motion.div>

              {/* Technical Details Panel */}
              <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                <CardHeader className="py-4 border-b border-white/5">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 flex-mono">
                    <Search className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    Technical Audit
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="grid grid-cols-1 gap-2 text-xs sm:text-sm font-mono">
                    <div className="flex justify-between p-2 rounded bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                      <span className="text-muted-foreground">HTTPS Security</span>
                      <span className={`font-medium ${scan.technical_details.https ? 'text-green-400 animate-pulse' : 'text-red-400 font-bold'}`}>
                        {scan.technical_details.https ? 'Active (HTTPS)' : 'Missing (HTTP)'}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                      <span className="text-muted-foreground">URL Length</span>
                      <span>{scan.technical_details.url_length} chars</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                      <span className="text-muted-foreground">Subdomains count</span>
                      <span>{scan.technical_details.subdomain_count}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                      <span className="text-muted-foreground">Contains IP Host</span>
                      <span className={scan.technical_details.contains_ip ? 'text-red-400 font-bold' : ''}>
                        {scan.technical_details.contains_ip ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                      <span className="text-muted-foreground">Suspicious TLD</span>
                      <span className={scan.technical_details.suspicious_tld ? 'text-red-400 font-bold' : ''}>
                        {scan.technical_details.suspicious_tld ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {scan.technical_details.path_depth !== undefined && scan.technical_details.path_depth !== null && (
                      <div className="flex justify-between p-2 rounded bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                        <span className="text-muted-foreground">Path Depth</span>
                        <span>{scan.technical_details.path_depth}</span>
                      </div>
                    )}
                    {scan.technical_details.query_parameter_count !== undefined && scan.technical_details.query_parameter_count !== null && (
                      <div className="flex justify-between p-2 rounded bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                        <span className="text-muted-foreground">Query Parameters</span>
                        <span>{scan.technical_details.query_parameter_count}</span>
                      </div>
                    )}
                    {scan.technical_details.entropy_score !== undefined && scan.technical_details.entropy_score !== null && (
                      <div className="flex justify-between p-2 rounded bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                        <span className="text-muted-foreground">URL Entropy</span>
                        <span>{scan.technical_details.entropy_score.toFixed(3)}</span>
                      </div>
                    )}
                  </div>
                  
                  {scan.technical_details.suspicious_keywords_found.length > 0 && (
                    <div className="pt-2 border-t border-white/5 font-mono">
                      <span className="block text-xs text-muted-foreground mb-1.5 uppercase font-bold tracking-wider">Flagged Keywords:</span>
                      <div className="flex flex-wrap gap-1">
                        {scan.technical_details.suspicious_keywords_found.map((kw, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-bold uppercase">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recommendation Panel */}
              {(() => {
                const getRecommendationStyle = (status: string) => {
                  switch (status.toUpperCase()) {
                    case 'SAFE':
                      return {
                        wrapper: 'bg-green-500/10 border-green-500/20 text-green-100/90 shadow-[0_0_15px_rgba(16,185,129,0.05)]',
                        title: 'text-green-400',
                      };
                    case 'SUSPICIOUS':
                      return {
                        wrapper: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-100/90 shadow-[0_0_15px_rgba(245,158,11,0.05)]',
                        title: 'text-yellow-400',
                      };
                    case 'DANGEROUS':
                      return {
                        wrapper: 'bg-red-500/10 border-red-500/20 text-red-100/90 shadow-[0_0_15px_rgba(239,68,68,0.05)]',
                        title: 'text-red-400',
                      };
                    default:
                      return {
                        wrapper: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-100/90 shadow-[0_0_15px_rgba(16,185,129,0.05)]',
                        title: 'text-emerald-400',
                      };
                  }
                };
                const recStyle = getRecommendationStyle(scan.status);
                return (
                  <div className={`p-4 rounded-lg border space-y-1.5 animate-in fade-in duration-300 font-mono ${recStyle.wrapper}`}>
                    <h4 className={`text-xs font-semibold uppercase tracking-wider ${recStyle.title}`}>
                      Action Recommendation
                    </h4>
                    <p className="text-xs leading-relaxed">
                      {scan.recommendation}
                    </p>
                  </div>
                );
              })()}

            </div>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
