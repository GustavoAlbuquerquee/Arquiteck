import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Versões anteriores do service worker guardavam respostas autenticadas do
// Supabase (REST/Auth) neste cache, que podia vazar dados para o próximo usuário.
export async function clearApiCache() {
  try {
    if ('caches' in window) await caches.delete('supabase-cache');
  } catch {
    // Cache API indisponível: nada a limpar
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mantém a mesma referência de `user` enquanto for o mesmo usuário, para que as
    // páginas que dependem de [user] não refaçam as consultas a cada refresh de token
    const applySession = (session: Session | null, event?: AuthChangeEvent) => {
      setSession(session);
      const next = session?.user ?? null;
      setUser((prev) =>
        prev && next && prev.id === next.id && event !== 'USER_UPDATED' ? prev : next,
      );
      setLoading(false);
    };

    // Verificar sessão atual
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => applySession(session))
      .catch((err) => {
        console.error('Erro ao recuperar sessão:', err);
        setLoading(false);
      });

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => applySession(session, event));

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Remove o cache de respostas da API criado por versões anteriores do service worker
    await clearApiCache();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
