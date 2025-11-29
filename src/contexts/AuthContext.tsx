import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithCode: (email: string, accessCode: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isClient: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signInWithCode = async (email: string, accessCode: string) => {
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('user_id, status')
      .eq('email', email)
      .eq('access_code', accessCode)
      .eq('status', 'active')
      .maybeSingle();

    if (clientError || !client) {
      throw new Error('Código de acesso inválido ou cliente inativo');
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', client.user_id)
      .maybeSingle();

    if (profileError || !profileData) {
      throw new Error('Perfil não encontrado');
    }

    const tempPassword = `temp_${accessCode.replace(/-/g, '')}`;

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profileData.email,
      password: tempPassword,
    });

    if (signInError) throw signInError;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signInWithCode,
    signOut,
    isAdmin: profile?.role === 'admin',
    isClient: profile?.role === 'client',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
