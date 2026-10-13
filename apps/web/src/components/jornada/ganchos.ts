import { useEffect, useState } from 'react';

/**
 * "Agora" que vira a cada minuto cheio. Os relógios do board leem daqui, então
 * todos andam juntos e a tela só renderiza uma vez por minuto.
 */
export function useAgora(): Date {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    let intervalo: number | undefined;
    const tique = () => setAgora(new Date());
    // Alinha no próximo minuto cheio e segue de 60 em 60 s
    const atraso = 60_000 - (Date.now() % 60_000) + 50;
    const inicio = window.setTimeout(() => {
      tique();
      intervalo = window.setInterval(tique, 60_000);
    }, atraso);
    // Ao voltar para a aba, atualiza na hora (o navegador segura timers em segundo plano)
    const aoVoltar = () => document.visibilityState === 'visible' && tique();
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      window.clearTimeout(inicio);
      if (intervalo) window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, []);
  return agora;
}

const CONSULTA_MOVIMENTO = '(prefers-reduced-motion: reduce)';

export function useMenosMovimento(): boolean {
  const [reduzir, setReduzir] = useState(
    () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(CONSULTA_MOVIMENTO).matches),
  );
  useEffect(() => {
    const mq = window.matchMedia?.(CONSULTA_MOVIMENTO);
    if (!mq) return;
    const mudou = () => setReduzir(mq.matches);
    mq.addEventListener('change', mudou);
    return () => mq.removeEventListener('change', mudou);
  }, []);
  return reduzir;
}

/** Preferência simples guardada no aparelho (aba, densidade). Falha em silêncio. */
export function usePreferencia<T extends string>(chave: string, padrao: T, validos: readonly T[]) {
  const [valor, setValor] = useState<T>(() => {
    try {
      const salvo = localStorage.getItem(chave) as T | null;
      if (salvo && validos.includes(salvo)) return salvo;
    } catch {
      // sem storage: fica no padrão
    }
    return padrao;
  });
  const mudar = (novo: T) => {
    setValor(novo);
    try {
      localStorage.setItem(chave, novo);
    } catch {
      // sem storage: vale só nesta visita
    }
  };
  return [valor, mudar] as const;
}

/** Inicial para o avatar: primeira letra do primeiro nome */
export function inicial(nome: string | null | undefined) {
  const n = (nome ?? '').trim();
  return n ? n[0].toLocaleUpperCase('pt-BR') : '?';
}

export function primeiroNome(nome: string | null | undefined) {
  return (nome ?? '').trim().split(/\s+/)[0] || 'Cliente';
}
