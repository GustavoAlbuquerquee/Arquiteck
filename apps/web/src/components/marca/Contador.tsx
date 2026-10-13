import { useEffect, useState } from 'react';

function prefereMenosMovimento() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Número que sobe até o valor final (ideia do CountUp do React Bits, escrita
 * aqui sem dependências). Com movimento reduzido mostra o valor direto.
 * Leitores de tela recebem só o valor final.
 */
export function Contador({ valor, duracao = 700 }: { valor: number; duracao?: number }) {
  const [exibido, setExibido] = useState(() => (prefereMenosMovimento() ? valor : 0));

  useEffect(() => {
    if (prefereMenosMovimento() || valor === 0) {
      setExibido(valor);
      return;
    }
    let quadro = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      const suavizado = 1 - Math.pow(1 - t, 3);
      setExibido(Math.round(valor * suavizado));
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor, duracao]);

  return (
    <>
      <span aria-hidden="true">{exibido}</span>
      <span className="sr-only">{valor}</span>
    </>
  );
}
