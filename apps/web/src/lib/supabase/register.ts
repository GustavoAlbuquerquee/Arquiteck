import { invokeFunction } from './functions';

export async function registerUser(
  email: string,
  password: string,
  nomeCompleto: string,
  nomeFantasia: string,
  cnpj: string
) {
  return invokeFunction('register-user', {
    email,
    password,
    nome_completo: nomeCompleto,
    nome_fantasia: nomeFantasia,
    cnpj,
  });
}
