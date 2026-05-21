'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { createClient } from '@/lib/supabase/client';
import axios from '@/lib/api/axios';
import Link from 'next/link';
import { 
  ArrowLeft, ShieldCheck, AlertTriangle, ShieldAlert, Info, 
  Activity, Search, Download, Loader2, FileText, Code, FileCode, CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import DashboardLayout from '@/app/dashboard/layout';
import { ScanResult } from '@/types/scan';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DetailedReportPage({ params }: PageProps) {
  const { id } = use(params);
  const [isExporting, setIsExporting] = useState<'pdf' | 'json' | 'txt' | null>(null);

  // Fetch detailed scan report using React Query
  const { data: scan, isLoading, isError } = useQuery<ScanResult>({
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
    retry: 1,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  const downloadReport = async (format: 'pdf' | 'json' | 'txt') => {
    setIsExporting(format);
    const toastId = toast.loading(`Preparing ${format.toUpperCase()} export...`);
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await axios.get(`/reports/export/${format}/${id}`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        },
        responseType: 'blob'
      });
      
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
      console.error(err);
      
      let errorMessage = `Export failed`;
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed && parsed.detail) {
            errorMessage = parsed.detail;
          } else {
            errorMessage = `Export failed with status ${err.response.status}`;
          }
        } catch (parseErr) {
          // Fallback if Blob doesn't contain valid JSON error detail
          if (err.response.status === 403) {
            errorMessage = 'Access denied. You do not own this scan report.';
          } else if (err.response.status === 404) {
            errorMessage = 'Report not found.';
          } else if (err.response.status === 401) {
            errorMessage = 'Unauthorized. Please log in again.';
          } else {
            errorMessage = `Export failed: Server returned status code ${err.response.status}`;
          }
        }
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsExporting(null);
    }
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
            We couldn't retrieve the details for this scan. The scan ID may be invalid, deleted, or you might not have permission to view it.
          </p>
          <Link href="/history">
            <Button variant="outline" className="border-white/10 hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to History
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

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

  const statusCfg = getStatusConfig(scan.status);

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6 relative z-10">
        
        {/* Back Link & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <Link href="/history" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to History
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Security Audit Detail</h1>
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
                <Code className="w-3.5 h-3.5 mr-1 text-blue-400" />
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
        </div>

        {/* 1. Threat Severity Banner */}
        <div className={`flex items-center gap-3 p-4 rounded-lg border ${statusCfg.bannerBg} backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300`}>
          <div className="flex-shrink-0">
            {statusCfg.icon}
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base">{statusCfg.statusText}</h3>
            <p className="text-xs sm:text-sm opacity-90">{statusCfg.explanation}</p>
          </div>
        </div>

        {/* 2. Scan Metadata Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/5 border border-white/10 rounded-lg text-xs sm:text-sm">
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
            <span className="capitalize">{scan.scan_type}</span>
          </div>
          <div>
            <span className="block text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Scan Time</span>
            <span className="block truncate">{new Date(scan.timestamp).toLocaleString()}</span>
          </div>
        </div>

        {/* Core Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Scanned URL Panel */}
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
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
            </Card>

            {/* Findings Panel */}
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
              <CardHeader className="border-b border-white/10 py-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-blue-400" />
                  Analysis Findings
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-3">
                {scan.reasons.length > 0 ? (
                  <div className="space-y-2">
                    {scan.reasons.map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                        <span className="text-red-500 font-bold leading-none mt-0.5">•</span>
                        <p className="text-sm text-foreground/90 leading-normal">{reason}</p>
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
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            
            {/* Score Summary Panel */}
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
              <CardHeader className="py-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Threat score
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-5 pt-0 text-center">
                <div className="mb-4">
                  <div className="text-5xl font-extrabold tracking-tight">
                    {scan.score}
                    <span className="text-xl text-muted-foreground font-normal">/100</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 uppercase font-semibold tracking-wider">
                    Calculated Threat Index
                  </p>
                </div>
                
                {/* Score Bar */}
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden mb-3">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 transition-all duration-1000"
                    style={{ width: `${scan.score}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0 (SAFE)</span>
                  <span>100 (DANGEROUS)</span>
                </div>
              </CardContent>
            </Card>

            {/* Technical Details Panel */}
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
              <CardHeader className="py-4 border-b border-white/10">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-purple-400" />
                  Technical Audit
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="grid grid-cols-1 gap-2 text-xs sm:text-sm">
                  <div className="flex justify-between p-2 rounded bg-white/5 border border-white/5">
                    <span className="text-muted-foreground">HTTPS Security</span>
                    <span className={`font-medium ${scan.technical_details.https ? 'text-green-400' : 'text-red-400 font-bold'}`}>
                      {scan.technical_details.https ? 'Active (HTTPS)' : 'Missing (HTTP)'}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-white/5 border border-white/5">
                    <span className="text-muted-foreground">URL Length</span>
                    <span>{scan.technical_details.url_length} chars</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-white/5 border border-white/5">
                    <span className="text-muted-foreground">Subdomains count</span>
                    <span>{scan.technical_details.subdomain_count}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-white/5 border border-white/5">
                    <span className="text-muted-foreground">Contains IP Host</span>
                    <span className={scan.technical_details.contains_ip ? 'text-red-400 font-bold' : ''}>
                      {scan.technical_details.contains_ip ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-white/5 border border-white/5">
                    <span className="text-muted-foreground">Suspicious TLD</span>
                    <span className={scan.technical_details.suspicious_tld ? 'text-red-400 font-bold' : ''}>
                      {scan.technical_details.suspicious_tld ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                
                {scan.technical_details.suspicious_keywords_found.length > 0 && (
                  <div className="pt-2 border-t border-white/5">
                    <span className="block text-xs text-muted-foreground mb-1.5">Flagged Keywords:</span>
                    <div className="flex flex-wrap gap-1">
                      {scan.technical_details.suspicious_keywords_found.map((kw, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[10px] font-mono text-red-400">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommendation Panel */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-1.5 animate-in fade-in duration-300">
              <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                Platform Action Recommendation
              </h4>
              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                {scan.recommendation}
              </p>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
