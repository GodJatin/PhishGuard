'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, LayoutDashboard, History, LogOut, Loader2, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isLoading } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Close mobile navigation on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Accessibility: Close menu on ESC key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setIsMobileMenuOpen(false);
    await signOut();
    router.push('/login');
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'History', href: '/history', icon: History },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-500" />
              <span className="font-bold text-lg tracking-tight hidden sm:inline-block">PhishGuard</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    className={`flex items-center gap-2 transition-colors ${
                      isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-sm text-muted-foreground font-mono">
              {user?.email}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="hidden md:flex text-muted-foreground hover:text-foreground transition-all hover:bg-white/5 active:scale-95"
            >
              {isLoggingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
              <span>Log out</span>
            </Button>
            
            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle mobile menu"
              className="md:hidden text-muted-foreground hover:text-foreground hover:bg-white/5 focus-visible:ring-1 focus-visible:ring-white/20"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Collapsible Mobile Navigation Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="md:hidden border-t border-white/10 bg-background/95 backdrop-blur-md overflow-hidden"
            >
              <div className="px-4 py-5 flex flex-col gap-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">
                  WORKSPACE DIRECTORY
                </span>
                <div className="flex flex-col gap-1">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link 
                        key={item.href} 
                        href={item.href}
                        className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                          isActive ? 'bg-white/10 text-foreground font-semibold shadow-inner' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                        }`}
                      >
                        <item.icon className="w-4.5 h-4.5" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
                <hr className="border-white/10" />
                <div className="flex flex-col gap-3 px-2">
                  <div className="text-xs text-muted-foreground font-mono truncate" title={user?.email}>
                    Logged in: {user?.email}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center justify-center gap-2 border-white/10 hover:bg-red-500/10 hover:text-red-400 active:scale-98 transition-all h-10"
                  >
                    {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    <span>Log out</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full relative">
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
