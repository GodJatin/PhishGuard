'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { DBScan } from '@/types/scan';
import Link from 'next/link';
import { motion, AnimatePresence, Variants } from 'framer-motion';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  History as HistoryIcon, Loader2, ShieldCheck, AlertTriangle, 
  ShieldAlert, ChevronRight, RefreshCw, Trash2, Shield 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
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
  exit: {
    opacity: 0,
    x: -30,
    transition: { duration: 0.25, ease: 'easeOut' }
  }
};

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const [deletedScanIds, setDeletedScanIds] = useState<string[]>([]);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const pendingDeletesRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Query scans from Supabase
  const { data: scans, isLoading, isError, refetch } = useQuery<DBScan[]>({
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
    retry: 1,
    retryDelay: 2000,
    refetchOnWindowFocus: false,
  });

  // Cleanup pending timeouts on unmount to prevent memory leaks/race conditions
  useEffect(() => {
    return () => {
      Object.values(pendingDeletesRef.current).forEach(clearTimeout);
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SAFE': return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      case 'SUSPICIOUS': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'DANGEROUS': return <ShieldAlert className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SAFE': return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
      case 'SUSPICIOUS': return 'text-amber-500 border-amber-500/20 bg-amber-500/10';
      case 'DANGEROUS': return 'text-red-500 border-red-500/20 bg-red-500/10';
      default: return 'text-muted-foreground border-border bg-muted';
    }
  };

  // Gmail-style soft delete with Undo capability
  const handleDeleteScan = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Instantly hide the row in UI
    setDeletedScanIds(prev => [...prev, id]);

    // 2. Spawn toast notification with Undo action
    const toastId = toast((t) => (
      <div className="flex items-center justify-between gap-3 text-xs font-mono">
        <span className="text-white">Scan report queued for deletion.</span>
        <button
          onClick={() => {
            // Cancel DB execution timer
            if (pendingDeletesRef.current[id]) {
              clearTimeout(pendingDeletesRef.current[id]);
              delete pendingDeletesRef.current[id];
            }
            // Remove from soft-delete list
            setDeletedScanIds(prev => prev.filter(x => x !== id));
            toast.dismiss(t.id);
            toast.success("Deletion cancelled", { duration: 1500 });
          }}
          className="text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider underline cursor-pointer bg-transparent border-0"
        >
          Undo
        </button>
      </div>
    ), { duration: 4000 });

    // 3. Queue the database delete query (executes after 4 seconds)
    const timeout = setTimeout(async () => {
      delete pendingDeletesRef.current[id];
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('scans')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        // Invalidate cache to sync state with database
        queryClient.invalidateQueries({ queryKey: ['history'] });
      } catch (err: any) {
        console.error("Failed to delete scan report:", err);
        // Restore row in UI if Supabase query fails
        setDeletedScanIds(prev => prev.filter(x => x !== id));
        toast.error("Failed to execute database delete transaction.");
      }
    }, 4000);

    pendingDeletesRef.current[id] = timeout;
  };

  // Destructive Clear All function
  const handleClearAll = async () => {
    setIsClearModalOpen(false);
    const toastId = toast.loading("Clearing database history...");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active user session found.");

      const { error } = await supabase
        .from('scans')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['history'] });
      toast.success("All threat scan logs deleted successfully", { id: toastId });
    } catch (err: any) {
      console.error("Failed to clear database logs:", err);
      toast.error("Clear transaction failed. Please try again.", { id: toastId });
    }
  };

  // Filter out soft-deleted items
  const visibleScans = scans ? scans.filter(s => !deletedScanIds.includes(s.id)) : [];

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8 relative z-10">
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Scan History</h1>
            <p className="text-muted-foreground">
              Review your past URL analyses and threat reports.
            </p>
          </div>
          {visibleScans.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearModalOpen(true)}
              className="border-red-500/25 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300 shrink-0 self-start sm:self-auto h-9 font-mono"
            >
              <Trash2 className="w-4 h-4 mr-1.5" /> Clear All History
            </Button>
          )}
        </div>

        <Card className="border-white/10 bg-black/40 backdrop-blur-xl min-h-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-emerald-500" />
              Recent Scans
            </CardTitle>
            <CardDescription>
              A chronological log of all your analyzed URLs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
                <p className="text-muted-foreground font-mono text-xs">Loading threat records...</p>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="relative mb-3">
                  <div className="absolute inset-0 bg-red-500/10 rounded-full blur-xl" />
                  <AlertTriangle className="w-9 h-9 text-red-500/70 relative z-10 animate-pulse" />
                </div>
                <h3 className="text-sm font-semibold text-foreground/90 mb-1">Failed to load history</h3>
                <p className="text-xs text-muted-foreground/60 max-w-[260px] mb-4">
                  Could not connect to the Supabase threat database. Check database state and try again.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="border-white/10 hover:bg-white/5 text-xs text-muted-foreground hover:text-foreground gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Sync
                </Button>
              </div>
            ) : visibleScans.length > 0 ? (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                <AnimatePresence initial={false}>
                  {visibleScans.map((scan) => (
                    <motion.div 
                      key={scan.id} 
                      variants={itemVariants}
                      exit="exit"
                      layout
                    >
                      <Link 
                        href={`/scan/${scan.id}`}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 cursor-pointer group transition-all duration-300 hover:bg-white/10 hover:border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.06)] hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
                          <div className="flex-shrink-0">
                            {getStatusIcon(scan.status)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-xs md:max-w-md group-hover:text-emerald-400 transition-colors">
                              {scan.url}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-mono">
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
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleDeleteScan(e, scan.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                <div className="relative mb-3">
                  <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl animate-pulse" />
                  <HistoryIcon className="w-9 h-9 text-emerald-500/60 relative z-10" />
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

      {/* Clear All Confirmation Modal */}
      <AnimatePresence>
        {isClearModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111215] border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left"
            >
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                Clear Security History?
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-mono">
                This action is permanent and cannot be undone. All threat database logs in your workspace will be deleted.
              </p>
              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsClearModalOpen(false)}
                  className="border-white/10 hover:bg-white/5 text-xs text-neutral-300 font-mono"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleClearAll}
                  className="bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-semibold shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                >
                  Confirm Clear
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </DashboardLayout>
  );
}
