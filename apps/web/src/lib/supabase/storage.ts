import { supabase } from './client';

/**
 * Converte uma string Base64 em Blob
 */
async function base64ToBlob(base64: string): Promise<Blob> {
  const response = await fetch(base64);
  return response.blob();
}

/**
 * Faz upload de uma imagem Base64 para o Supabase Storage
 * @param base64Str - String Base64 da imagem (com prefixo data:image/...)
 * @param path - Caminho do arquivo no bucket (ex: tenant_id/fotos/foto-123.jpg)
 * @param bucket - Nome do bucket (padrão: 'vistorias')
 * @returns O caminho do arquivo no bucket, ou null em caso de erro.
 *   O bucket 'vistorias' é privado: para exibir, gere uma URL assinada
 *   com gerarUrlsAssinadas.
 */
export async function uploadBase64Image(
  base64Str: string,
  path: string,
  bucket: string = 'vistorias'
): Promise<string | null> {
  try {
    // Converter Base64 para Blob
    const blob = await base64ToBlob(base64Str);

    // Upload para o Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, blob, {
        upsert: true,
        contentType: blob.type
      });

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      return null;
    }

    return path;
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    return null;
  }
}

/**
 * Extrai o caminho do arquivo dentro do bucket a partir de uma URL do Storage
 * (pública ou assinada). Devolve null se a URL não for desse bucket.
 */
export function storagePathFromPublicUrl(
  url: string,
  bucket: string = 'vistorias'
): string | null {
  const m = new RegExp(`/storage/v1/object/(?:public|sign)/${bucket}/([^?#]+)`).exec(url);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Caminho no bucket de um arquivo salvo no payload. Briefings antigos guardam
 * a URL pública; os novos guardam só o caminho. Devolve null para base64
 * (imagem ainda não enviada) e para URLs de outros lugares.
 */
export function caminhoNoBucket(
  valor: string | null | undefined,
  bucket: string = 'vistorias'
): string | null {
  if (!valor || valor.startsWith('data:')) return null;
  if (/^https?:\/\//.test(valor)) return storagePathFromPublicUrl(valor, bucket);
  return valor;
}

/**
 * Gera URLs assinadas (temporárias) para exibir arquivos do bucket privado.
 * Só funcionam para arquivos da pasta do tenant do usuário (RLS do Storage).
 * @returns mapa valor original -> URL assinada; valores que falharem ficam de fora
 */
export async function gerarUrlsAssinadas(
  valores: string[],
  bucket: string = 'vistorias',
  expiraEmSegundos: number = 60 * 60
): Promise<Record<string, string>> {
  const caminhoDe = new Map<string, string>();
  for (const valor of valores) {
    const caminho = caminhoNoBucket(valor, bucket);
    if (caminho) caminhoDe.set(valor, caminho);
  }
  const caminhos = [...new Set(caminhoDe.values())];
  if (caminhos.length === 0) return {};

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(caminhos, expiraEmSegundos);
  if (error || !data) {
    console.error('Erro ao gerar URLs das imagens:', error);
    return {};
  }

  const urlDoCaminho = new Map<string, string>();
  for (const item of data) {
    if (item.path && item.signedUrl) urlDoCaminho.set(item.path, item.signedUrl);
  }

  const mapa: Record<string, string> = {};
  caminhoDe.forEach((caminho, valor) => {
    const url = urlDoCaminho.get(caminho);
    if (url) mapa[valor] = url;
  });
  return mapa;
}
