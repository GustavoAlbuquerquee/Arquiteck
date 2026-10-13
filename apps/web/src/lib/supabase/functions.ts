import { supabase } from './client';

/**
 * Chama uma Edge Function e lança Error com a mensagem retornada no corpo
 * ({ error: string }), em vez do genérico "non-2xx status code".
 */
export async function invokeFunction<T = unknown>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    let message = error.message;
    try {
      const payload = await (error as { context?: Response }).context?.json();
      if (payload?.error) message = payload.error;
    } catch {
      // corpo não era JSON: mantém a mensagem original
    }
    throw new Error(message);
  }

  return data as T;
}
