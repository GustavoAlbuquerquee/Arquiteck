import { supabase } from './client';

export async function registerUser(
  email: string,
  password: string,
  nomeCompleto: string,
  nomeFantasia: string,
  cnpj: string
) {
  const response = await supabase.functions.invoke('register-user', {
    body: { 
      email, 
      password, 
      nome_completo: nomeCompleto, 
      nome_fantasia: nomeFantasia, 
      cnpj 
    },
  });

  if (response.error) {
    throw response.error;
  }

  return response.data;
}
