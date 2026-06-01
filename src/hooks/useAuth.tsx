import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type AppRole = 'client' | 'vendor' | 'admin';
type Profile = Tables<'profiles'>;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  roles: AppRole[];
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: { full_name?: string; phone?: string }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch profile and roles when user changes
  const fetchUserData = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setRoles([]);
      return;
    }

    const [profileRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', currentUser.id).single(),
      supabase.from('user_roles').select('role').eq('user_id', currentUser.id),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data as Profile);
    }

    if (rolesRes.data) {
      setRoles(rolesRes.data.map((r: { role: string }) => r.role as AppRole));
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      setLoading(true);
      // getUser validates the session with the auth server
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (error || !currentUser) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setRoles([]);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      // Get session for token access
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (isMounted) {
        setSession(currentSession);
      }

      await fetchUserData(currentUser);

      if (isMounted) {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      const newUser = newSession?.user ?? null;
      setUser(newUser);
      setSession(newSession);
      await fetchUserData(newUser);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, metadata?: { full_name?: string; phone?: string }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: metadata,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    roles,
    signIn,
    signUp,
    signOut,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
