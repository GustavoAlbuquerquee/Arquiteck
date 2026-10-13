const MAX_LADO = 1600;
const QUALIDADE_JPEG = 0.8;

function lerComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler a imagem"));
    reader.readAsDataURL(file);
  });
}

/**
 * Reduz a foto para no máximo 1600px no maior lado e converte para JPEG.
 * Uma foto de câmera (4–8 MB) cai para algumas centenas de KB, o que evita
 * travar o celular com muitas fotos no formulário.
 * Se o navegador não conseguir decodificar o arquivo (ex.: HEIC no Chrome),
 * devolve o arquivo original sem compressão.
 */
export async function comprimirImagem(file: File): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return lerComoDataUrl(file);
  }

  const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return lerComoDataUrl(file);
  }

  // Fundo branco para PNGs com transparência não ficarem pretos no JPEG
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", QUALIDADE_JPEG);
}
