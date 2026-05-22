import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  deferredPrompt: any;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (isLoading: boolean) => void;
  setGuest: (isGuest: boolean) => void;
  setDeferredPrompt: (prompt: any) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  isGuest: false,
  deferredPrompt: null,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),
  setDeferredPrompt: (deferredPrompt) => set({ deferredPrompt }),
  setGuest: (isGuest) => {
    if (typeof window !== 'undefined') {
      if (isGuest) {
        localStorage.setItem('phishguard_is_guest', 'true');
      } else {
        localStorage.removeItem('phishguard_is_guest');
      }
    }
    set({ isGuest });
  },
  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('phishguard_is_guest');
    }
    set({ user: null, session: null, isGuest: false });
  },
  initialize: async () => {
    const supabase = createClient();
    try {
      const isGuestStr = typeof window !== 'undefined' ? localStorage.getItem('phishguard_is_guest') : null;
      const isGuest = isGuestStr === 'true';
      
      const { data: { session } } = await supabase.auth.getSession();
      set({ 
        session, 
        user: session?.user || null, 
        isGuest: session?.user ? false : isGuest, 
        isLoading: false 
      });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ 
          session, 
          user: session?.user || null, 
          isGuest: session?.user ? false : (typeof window !== 'undefined' ? localStorage.getItem('phishguard_is_guest') === 'true' : false),
          isLoading: false 
        });
      });
    } catch (error) {
      console.error('Failed to initialize auth', error);
      set({ isLoading: false });
    }
  }
}));
