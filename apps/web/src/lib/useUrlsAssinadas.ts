import { useCallback, useEffect, useState } from "react";
import { gerarUrlsAssinadas } from "@/lib/supabase/storage";

/**
 * Resolve fotos/assinaturas do bucket privado 'vistorias' para URLs
 * assinadas que podem ir no <img src>. Imagens ainda em base64 (data:)
 * passam direto. Enquanto a URL não chega, devolve undefined.
 */
export function useUrlsAssinadas(valores: (string | null | undefined)[]) {
  const [mapa, setMapa] = useState<Record<string, string>>({});

  const remotos = valores.filter(
    (v): v is string => !!v && !v.startsWith("data:"),
  );
  // Chave estável para o efeito não rodar a cada render
  const chave = [...new Set(remotos)].sort().join("\n");

  useEffect(() => {
    const pendentes = chave ? chave.split("\n").filter((v) => !mapa[v]) : [];
    if (pendentes.length === 0) return;
    let cancelado = false;
    gerarUrlsAssinadas(pendentes).then((novas) => {
      if (!cancelado) setMapa((prev) => ({ ...prev, ...novas }));
    });
    return () => {
      cancelado = true;
    };
    // mapa fica fora das dependências: só valores novos disparam a busca
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return useCallback(
    (valor: string | null | undefined): string | undefined => {
      if (!valor) return undefined;
      if (valor.startsWith("data:")) return valor;
      return mapa[valor];
    },
    [mapa],
  );
}
