'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, LayoutDashboard, History, LogOut, Loader2, Menu } from 'lucide-react';

import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isLoading } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
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
            <div className="hidden sm:block text-sm text-muted-foreground">
              {user?.email}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-muted-foreground hover:text-foreground"
            >
              {isLoggingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
              <span className="hidden sm:inline">Log out</span>
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full relative">
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />
        {children}
      </main>
    </div>
  );
}
