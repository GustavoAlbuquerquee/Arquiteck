import { supabase } from './client';

export async function createTenant(nomeFantasia: string, cnpj: string, nomeCompleto?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  const response = await supabase.functions.invoke('create-tenant', {
    body: { nome_fantasia: nomeFantasia, cnpj, nome_completo: nomeCompleto },
  });

  if (response.error) {
    throw response.error;
  }

  return response.data;
}
