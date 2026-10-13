import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper para obter o tenant_id do usuário logado.
// Lê de profiles (fonte usada pela RLS); user_metadata pode ser editado pelo próprio usuário.
export const getCurrentTenantId = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', session.user.id)
    .maybeSingle();

  return data?.tenant_id ?? null;
};
