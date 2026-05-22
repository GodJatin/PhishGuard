'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { DBScan } from '@/types/scan';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History as HistoryIcon, Loader2, ShieldCheck, AlertTriangle, ShieldAlert, ChevronRight } from 'lucide-react';
import DashboardLayout from '../dashboard/layout';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 25,
    },
  },
};

export default function HistoryPage() {
  const { data: scans, isLoading, isError } = useQuery<DBScan[]>({
    queryKey: ['history'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SAFE': return <ShieldCheck className="w-5 h-5 text-green-400" />;
      case 'SUSPICIOUS': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'DANGEROUS': return <ShieldAlert className="w-5 h-5 text-red-400" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SAFE': return 'text-green-400 border-green-400/20 bg-green-400/10';
      case 'SUSPICIOUS': return 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10';
      case 'DANGEROUS': return 'text-red-400 border-red-400/20 bg-red-400/10';
      default: return 'text-muted-foreground border-border bg-muted';
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8 relative z-10">
        
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Scan History</h1>
          <p className="text-muted-foreground">
            Review your past URL analyses and threat reports.
          </p>
        </div>

        <Card className="border-white/10 bg-black/40 backdrop-blur-xl min-h-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-blue-400" />
              Recent Scans
            </CardTitle>
            <CardDescription>
              A chronological log of all your analyzed URLs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                <p className="text-muted-foreground">Loading history...</p>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-destructive">
                <AlertTriangle className="w-8 h-8 mb-4" />
                <p>Failed to load history. Please try again.</p>
              </div>
            ) : scans && scans.length > 0 ? (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {scans.map((scan) => (
                  <motion.div key={scan.id} variants={itemVariants}>
                    <Link 
                      href={`/scan/${scan.id}`}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 cursor-pointer group transition-all duration-300 hover:bg-white/10 hover:border-blue-500/40 hover:shadow-[0_0_15px_rgba(37,99,235,0.12)] hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
                        <div className="flex-shrink-0">
                          {getStatusIcon(scan.status)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                            {scan.url}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{new Date(scan.created_at).toLocaleString()}</span>
                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                            <span>Score: {scan.score}/100</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-4 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                        <div className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusColor(scan.status)}`}>
                          {scan.status.toUpperCase()}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>

            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                <div className="relative mb-3">
                  <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl animate-pulse" />
                  <HistoryIcon className="w-9 h-9 text-blue-500/60 relative z-10" />
                </div>
                <h3 className="text-sm font-semibold text-foreground/90 mb-1">Start your first threat analysis</h3>
                <p className="text-xs text-muted-foreground/60 max-w-[260px] mb-4">
                  Run a scan to generate threat intelligence insights and build your history.
                </p>
                <Link href="/dashboard">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-white/10 hover:bg-white/5 text-xs text-muted-foreground hover:text-foreground font-mono focus-visible:ring-1 focus-visible:ring-white/20 transition-all active:scale-95"
                  >
                    Run First Scan
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
