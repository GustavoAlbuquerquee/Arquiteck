import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Painel modal acessível: foco preso dentro, Esc fecha, o foco volta para quem
 * abriu e o fundo fica inerte. "lateral" desliza da direita (detalhes do card);
 * "centro" é o diálogo de formulário.
 */
export function Dialogo({
  aberto,
  onFechar,
  rotuloId,
  variante,
  focoInicial,
  children,
}: {
  aberto: boolean;
  onFechar: () => void;
  rotuloId: string;
  variante: 'lateral' | 'centro';
  focoInicial?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  useEffect(() => {
    if (!aberto) return;
    const origem = document.activeElement as HTMLElement | null;
    const conteudo = document.getElementById('conteudo');
    const raiz = document.getElementById('root');
    raiz?.setAttribute('inert', '');
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const quadro = requestAnimationFrame(() => {
      const alvo = focoInicial?.current ?? caixa.current?.querySelector<HTMLElement>(FOCAVEIS);
      (alvo ?? caixa.current)?.focus();
    });

    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        fechar.current();
        return;
      }
      if (e.key !== 'Tab' || !caixa.current) return;
      const itens = Array.from(caixa.current.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (!itens.length) return;
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener('keydown', tecla);

    return () => {
      cancelAnimationFrame(quadro);
      document.removeEventListener('keydown', tecla);
      raiz?.removeAttribute('inert');
      document.body.style.overflow = rolagem;
      // Devolve o foco para o elemento que abriu, se ele ainda existir
      if (origem && document.contains(origem)) origem.focus();
      else conteudo?.focus();
    };
  }, [aberto, focoInicial]);

  if (!aberto) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal">
      <div
        aria-hidden="true"
        onClick={onFechar}
        className="absolute inset-0 bg-primor-veu/55 motion-safe:animate-[jornada-veu_200ms_ease-out]"
      />
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={rotuloId}
        tabIndex={-1}
        className={
          variante === 'lateral'
            ? 'absolute inset-y-0 right-0 flex w-full max-w-[30rem] flex-col border-l border-primor-line bg-primor-bg-light shadow-chapa-lg focus:outline-none motion-safe:animate-[jornada-gaveta_260ms_cubic-bezier(0.2,0.7,0.2,1)]'
            : 'absolute inset-x-4 top-1/2 mx-auto max-h-[calc(100dvh-2rem)] max-w-lg -translate-y-1/2 overflow-y-auto rounded-xl border border-primor-line bg-primor-surface shadow-chapa-lg focus:outline-none motion-safe:animate-[jornada-surgir_220ms_cubic-bezier(0.2,0.7,0.2,1)]'
        }
      >
        {children}
      </div>
      <style>{`
        @keyframes jornada-veu { from { opacity: 0 } to { opacity: 1 } }
        @keyframes jornada-gaveta { from { transform: translateX(32px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes jornada-surgir { from { transform: translateY(calc(-50% + 10px)); opacity: 0 } to { transform: translateY(-50%); opacity: 1 } }
      `}</style>
    </div>,
    document.body,
  );
}
