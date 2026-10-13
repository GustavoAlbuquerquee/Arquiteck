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
 * @returns URL pública da imagem ou null em caso de erro
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

    // Obter URL pública
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    return null;
  }
}

/**
 * Extrai o caminho do arquivo dentro do bucket a partir da URL pública
 * (o inverso de getPublicUrl). Devolve null se a URL não for desse bucket.
 */
export function storagePathFromPublicUrl(
  url: string,
  bucket: string = 'vistorias'
): string | null {
  const marcador = `/storage/v1/object/public/${bucket}/`;
  const i = url.indexOf(marcador);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marcador.length).split('?')[0]);
}
