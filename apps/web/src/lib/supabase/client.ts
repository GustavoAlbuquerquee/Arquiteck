import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper para obter o tenant_id do usuário logado
export const getCurrentTenantId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata?.tenant_id || null;
};
