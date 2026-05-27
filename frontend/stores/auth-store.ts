import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/utils/localStorage';

const GUEST_KEY = 'phishguard_is_guest';
const GUEST_SCANS_KEY = 'phishguard_guest_scans';

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
    if (isGuest) {
      safeSetItem(GUEST_KEY, 'true');
    } else {
      safeRemoveItem(GUEST_KEY);
    }
    set({ isGuest });
  },
  signOut: async () => {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out from Supabase auth service:', error);
    }
    // Clean up all guest data on sign-out
    safeRemoveItem(GUEST_KEY);
    safeRemoveItem(GUEST_SCANS_KEY);
    set({ user: null, session: null, isGuest: false });
  },
  initialize: async () => {
    const supabase = createClient();
    try {
      const isGuestStored = safeGetItem(GUEST_KEY) === 'true';

      const { data: { session } } = await supabase.auth.getSession();
      // If there's a real session, never treat as guest regardless of localStorage
      const resolvedGuest = session?.user ? false : isGuestStored;

      set({
        session,
        user: session?.user || null,
        isGuest: resolvedGuest,
        isLoading: false
      });

      supabase.auth.onAuthStateChange((_event, newSession) => {
        // Re-read guest flag from storage on each auth state change
        const currentGuestFlag = safeGetItem(GUEST_KEY) === 'true';
        set({
          session: newSession,
          user: newSession?.user || null,
          // If user is now authenticated, guest mode is always false
          isGuest: newSession?.user ? false : currentGuestFlag,
          isLoading: false
        });
      });
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isLoading: false });
    }
  }
}));

