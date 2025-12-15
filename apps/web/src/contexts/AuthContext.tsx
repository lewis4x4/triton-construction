import { createContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '@triton/supabase-client';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import type { Tables } from '@triton/shared';

type UserProfile = Tables<'user_profiles'>;

// Session refresh interval (5 minutes)
const SESSION_REFRESH_INTERVAL = 5 * 60 * 1000;
// Session warning threshold (10 minutes before expiry)
const SESSION_WARNING_THRESHOLD = 10 * 60 * 1000;

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, metadata?: SignUpMetadata) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

interface SignUpMetadata {
  first_name?: string;
  last_name?: string;
  organization_id?: string;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception fetching profile:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;

    const profile = await fetchProfile(state.user.id);
    setState(prev => ({ ...prev, profile }));
  }, [state.user, fetchProfile]);

  // Ref to track refresh interval
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Manual session refresh function
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Error refreshing session:', error);
        // If refresh fails, the session is likely expired - sign out
        if (error.message?.includes('refresh_token') || error.message?.includes('expired')) {
          console.log('Session expired, signing out...');
          setState({
            user: null,
            session: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
          });
          return false;
        }
        return false;
      }

      if (data.session) {
        const profile = await fetchProfile(data.session.user.id);
        setState({
          user: data.session.user,
          session: data.session,
          profile,
          isLoading: false,
          isAuthenticated: true,
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Exception refreshing session:', err);
      return false;
    }
  }, [fetchProfile]);

  // Check if session needs refresh based on expiry time
  const checkAndRefreshSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return;

    const expiresAt = session.expires_at;
    if (!expiresAt) return;

    const expiryTime = expiresAt * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;

    // If less than 10 minutes until expiry, refresh now
    if (timeUntilExpiry < SESSION_WARNING_THRESHOLD) {
      console.log('Session expiring soon, refreshing...');
      await refreshSession();
    }
  }, [refreshSession]);

  // Handle visibility change - refresh session when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && state.isAuthenticated) {
        console.log('Tab became visible, checking session...');
        await checkAndRefreshSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.isAuthenticated, checkAndRefreshSession]);

  // Set up periodic session refresh
  useEffect(() => {
    if (state.isAuthenticated) {
      // Clear any existing interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // Set up new refresh interval
      refreshIntervalRef.current = setInterval(() => {
        checkAndRefreshSession();
      }, SESSION_REFRESH_INTERVAL);

      // Initial check
      checkAndRefreshSession();
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [state.isAuthenticated, checkAndRefreshSession]);

  useEffect(() => {
    // Get initial session with error handling
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      let profile: UserProfile | null = null;

      if (session?.user) {
        profile = await fetchProfile(session.user.id);
      }

      setState({
        user: session?.user ?? null,
        session,
        profile,
        isLoading: false,
        isAuthenticated: !!session,
      });
    }).catch((err) => {
      console.error('Exception getting session:', err);
      setState(prev => ({ ...prev, isLoading: false }));
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          let profile: UserProfile | null = null;

          if (session?.user) {
            profile = await fetchProfile(session.user.id);
          }

          setState({
            user: session?.user ?? null,
            session,
            profile,
            isLoading: false,
            isAuthenticated: !!session,
          });

          if (event === 'SIGNED_OUT') {
            // Clear any cached data on sign out
            setState(prev => ({ ...prev, profile: null }));
          }
        } catch (err) {
          console.error('Exception in auth state change:', err);
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: SignUpMetadata
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    return { error };
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
    } catch (err) {
      console.error('Exception signing out:', err);
    } finally {
      // Force clear state to ensure UI updates even if the event listener fails
      setState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
      });
      // Clear any persisted data if needed (optional)
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-refresh-token');
    }
  }, []);

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
