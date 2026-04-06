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
 * Faz upload de múltiplas imagens Base64
 * @param base64Array - Array de strings Base64
 * @param pathPrefix - Prefixo do caminho (ex: tenant_id/fotos)
 * @param bucket - Nome do bucket
 * @returns Array de URLs públicas
 */
export async function uploadMultipleBase64Images(
  base64Array: string[],
  pathPrefix: string,
  bucket: string = 'vistorias'
): Promise<string[]> {
  const uploadPromises = base64Array.map((base64, index) => {
    const timestamp = Date.now();
    const path = `${pathPrefix}/foto-${timestamp}-${index}.jpg`;
    return uploadBase64Image(base64, path, bucket);
  });

  const results = await Promise.all(uploadPromises);
  return results.filter((url): url is string => url !== null);
}
