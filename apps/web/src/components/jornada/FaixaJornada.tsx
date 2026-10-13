import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { VeioMadeira } from '@/components/marca/VeioMadeira';
import type { DefinicaoEtapa } from '@/lib/jornada/etapas';

/* ------------------------------------------------------------------
   Coluna (etapa)
   ------------------------------------------------------------------ */

export const idColuna = (etapa: string) => `coluna:${etapa}`;
export const idElementoColuna = (etapa: string) => `etapa-${etapa}`;

export function ColunaJornada({
  etapa,
  numero,
  quantidade,
  atrasados,
  colapsada,
  arrastando,
  destacada,
  estreita = false,
  children,
  rodape,
}: {
  etapa: DefinicaoEtapa;
  numero: number;
  quantidade: number;
  atrasados: number;
  /** Vazia: vira uma tira estreita, mas continua aceitando cards */
  colapsada: boolean;
  /** Há um card sendo arrastado em algum lugar do board */
  arrastando: boolean;
  /** Acabou de ser escolhida no mini-mapa */
  destacada: boolean;
  /** Execução: cards sem botão de contato cabem numa coluna mais estreita */
  estreita?: boolean;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: idColuna(etapa.id), data: { etapa: etapa.id } });
  const idTitulo = `titulo-${idElementoColuna(etapa.id)}`;
  const num = String(numero).padStart(2, '0');

  const realce = isOver
    ? 'border-primor-primary bg-primor-realce shadow-[0_0_0_3px_rgb(var(--primor-primary)/0.35)]'
    : destacada
      ? 'border-primor-secondary bg-primor-paper-deep/70'
      : arrastando
        ? 'border-dashed border-primor-line-strong bg-primor-paper-deep/50'
        : 'border-primor-line bg-primor-paper-deep/50';

  if (colapsada) {
    return (
      <section
        ref={setNodeRef}
        id={idElementoColuna(etapa.id)}
        aria-labelledby={idTitulo}
        data-etapa={etapa.id}
        className={`relative flex w-14 shrink-0 snap-start flex-col items-center rounded-xl border pb-4 pt-3 transition-[background-color,border-color,box-shadow] duration-200 ${realce}`}
      >
        <span aria-hidden="true" className="font-mono text-[11px] text-primor-muted tabular">
          {num}
        </span>
        <span aria-hidden="true" className="mt-1 font-mono text-sm font-medium text-primor-muted tabular">
          0
        </span>
        <h2
          id={idTitulo}
          tabIndex={-1}
          className="mt-3 whitespace-nowrap font-display text-sm font-semibold text-primor-muted [writing-mode:vertical-rl] rotate-180"
        >
          {etapa.rotulo}
          <span className="sr-only">, etapa {numero}, nenhum card</span>
        </h2>
        {arrastando && etapa.avisaCliente && (
          <MessageCircle
            aria-hidden="true"
            className="mt-auto h-4 w-4 text-primor-primary-ink"
          />
        )}
      </section>
    );
  }

  return (
    <section
      ref={setNodeRef}
      id={idElementoColuna(etapa.id)}
      aria-labelledby={idTitulo}
      data-etapa={etapa.id}
      className={`relative flex w-[84%] min-w-[16rem] shrink-0 snap-start flex-col rounded-xl border transition-[background-color,border-color,box-shadow] duration-200 sm:w-auto sm:flex-1 sm:basis-0 ${estreita ? 'sm:min-w-[13rem]' : 'sm:min-w-[15.5rem]'} ${realce}`}
    >
      <header className="px-3 pb-2 pt-3">
        <div className="flex items-baseline gap-2">
          <span aria-hidden="true" className="font-mono text-[11px] text-primor-muted tabular">
            {num}
          </span>
          <h2
            id={idTitulo}
            tabIndex={-1}
            className="min-w-0 flex-1 truncate rounded font-display text-[1.0625rem] font-semibold text-primor-secondary"
            style={{ fontVariationSettings: "'opsz' 24" }}
          >
            {etapa.rotulo}
            <span className="sr-only">
              , etapa {numero}, {quantidade} {quantidade === 1 ? 'card' : 'cards'}
              {atrasados > 0 ? `, ${atrasados} atrasado${atrasados > 1 ? 's' : ''}` : ''}
            </span>
          </h2>
          <span
            aria-hidden="true"
            className="rounded-md bg-primor-surface px-1.5 py-0.5 font-mono text-sm font-medium text-primor-secondary tabular shadow-[inset_0_0_0_1px_rgb(var(--primor-line))]"
          >
            {quantidade}
          </span>
        </div>
        <div className="mt-0.5 flex min-h-[1.25rem] items-center gap-2 text-xs">
          {arrastando && etapa.avisaCliente ? (
            <span className="inline-flex items-center gap-1 font-medium text-primor-primary-ink">
              <MessageCircle aria-hidden="true" className="h-3.5 w-3.5" />
              Avisa o cliente no WhatsApp
            </span>
          ) : (
            <span className="truncate text-primor-muted">{etapa.descricao}</span>
          )}
          {atrasados > 0 && !arrastando && (
            <span aria-hidden="true" className="ml-auto shrink-0 font-medium text-primor-erro">
              {atrasados} atrasado{atrasados > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>
      <ul className="flex-1 space-y-2 px-2 pb-2 sm:max-h-[min(38rem,64vh)] sm:overflow-y-auto sm:overscroll-contain">
        {children}
      </ul>
      {rodape}
    </section>
  );
}

/* ------------------------------------------------------------------
   Faixa (Venda / Execução): trilho horizontal com as colunas
   ------------------------------------------------------------------ */

function useRolagemHorizontal() {
  const ref = useRef<HTMLDivElement>(null);
  const [bordas, setBordas] = useState({ inicio: true, fim: true });

  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const inicio = el.scrollLeft <= 2;
    const fim = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setBordas((b) => (b.inicio === inicio && b.fim === fim ? b : { inicio, fim }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    medir();
    el.addEventListener('scroll', medir, { passive: true });
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    for (const filho of Array.from(el.children)) obs.observe(filho);
    return () => {
      el.removeEventListener('scroll', medir);
      obs.disconnect();
    };
  }, [medir]);

  return { ref, bordas, medir };
}

export function FaixaJornada({
  id,
  rotulo,
  descricao,
  total,
  children,
}: {
  id: string;
  rotulo: string;
  descricao: string;
  total: number;
  children: ReactNode;
}) {
  const { ref, bordas, medir } = useRolagemHorizontal();
  const arraste = useRef<{ x: number; rolagem: number; id: number } | null>(null);
  const [panoramica, setPanoramica] = useState(false);
  const rolavel = !(bordas.inicio && bordas.fim);

  useEffect(medir);

  // Mouse: arrastar o fundo do trilho rola as colunas (no toque, o dedo já rola)
  const aoApertar = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !rolavel) return;
    if ((e.target as HTMLElement).closest('article, button, a, input, textarea, select')) return;
    arraste.current = { x: e.clientX, rolagem: ref.current!.scrollLeft, id: e.pointerId };
    ref.current!.setPointerCapture(e.pointerId);
    setPanoramica(true);
  };
  const aoMover = (e: PointerEvent<HTMLDivElement>) => {
    if (!arraste.current || !ref.current) return;
    ref.current.scrollLeft = arraste.current.rolagem - (e.clientX - arraste.current.x);
  };
  const aoSoltar = () => {
    if (arraste.current && ref.current?.hasPointerCapture(arraste.current.id)) {
      ref.current.releasePointerCapture(arraste.current.id);
    }
    arraste.current = null;
    setPanoramica(false);
  };

  const rolar = (sentido: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: sentido * Math.max(260, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  const mascara =
    bordas.inicio && bordas.fim
      ? undefined
      : `linear-gradient(to right, ${bordas.inicio ? '#000' : 'transparent'} 0, #000 28px, #000 calc(100% - 28px), ${
          bordas.fim ? '#000' : 'transparent'
        } 100%)`;

  return (
    <section aria-labelledby={`faixa-${id}`} className="min-w-0">
      <div className="mb-3 flex items-center gap-3">
        <h2
          id={`faixa-${id}`}
          className="relative isolate overflow-hidden rounded-md bg-primor-madeira px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primor-primary shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)]"
        >
          <VeioMadeira opacidade={0.22} semente={id === 'venda' ? 11 : 23} className="-z-10" />
          {rotulo}
        </h2>
        <p className="min-w-0 truncate text-sm text-primor-muted">
          {descricao}
          <span className="font-mono tabular"> · {total}</span>
          <span className="sr-only"> {total === 1 ? 'card' : 'cards'}</span>
        </p>
        <div aria-hidden="true" className="regua hidden flex-1 sm:block" />
        {rolavel && (
          <div className="ml-auto flex shrink-0 gap-1 sm:ml-0">
            <button
              type="button"
              onClick={() => rolar(-1)}
              disabled={bordas.inicio}
              aria-label={`Rolar ${rotulo} para a esquerda`}
              className="btn-icon text-primor-secondary hover:bg-primor-paper-deep disabled:opacity-30"
            >
              <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => rolar(1)}
              disabled={bordas.fim}
              aria-label={`Rolar ${rotulo} para a direita`}
              className="btn-icon text-primor-secondary hover:bg-primor-paper-deep disabled:opacity-30"
            >
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
      <div
        ref={ref}
        onPointerDown={aoApertar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        style={{ maskImage: mascara, WebkitMaskImage: mascara }}
        className={`-mx-4 flex snap-x snap-mandatory scroll-px-4 items-start gap-3 [scrollbar-width:thin] sm:items-stretch overflow-x-auto px-4 pb-3 sm:mx-0 sm:snap-none sm:px-0 ${
          panoramica ? 'cursor-grabbing select-none' : rolavel ? 'sm:cursor-grab' : ''
        }`}
      >
        {children}
      </div>
    </section>
  );
}
