import { forwardRef, type HTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import { useDraggable, type DraggableAttributes, type DraggableSyntheticListeners } from '@dnd-kit/core';
import {
  BellRing,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  GripVertical,
  Hourglass,
  Loader2,
  MessageCircle,
  Snowflake,
} from 'lucide-react';
import { etapaVizinha, rotuloEtapa, type Etapa } from '@/lib/jornada/etapas';
import {
  META_RESPOSTA_MIN,
  descreverQuando,
  formatarDuracao,
  type Situacao,
} from '@/lib/jornada/relogios';
import type { ProjetoJornada, TipoContato } from '@/lib/jornada/dados';
import { formatarData } from '@/lib/date';
import { inicial } from './ganchos';

/**
 * Card estreito (coluna apertada no tablet ou na execução): o avatar sai para
 * o nome caber e o relógio usa um corpo menor. Renderizado uma vez pela página.
 */
export const CSS_CARD = `
.card-jornada { container-type: inline-size; }
@container (max-width: 13.5rem) {
  .card-jornada-avatar { display: none; }
  .card-jornada-relogio { font-size: 0.75rem; }
}`;

export interface CardModelo {
  projeto: ProjetoJornada;
  situacao: Situacao;
  esfriando: number | null;
  ultimaMensagem: string | null;
  toquesFollowup: number;
  peso: number;
}

export type Tom = 'atrasado' | 'prazo' | 'atencao' | 'neutro' | 'feito';

export const CLASSE_TOM: Record<Tom, { chip: string; fita: string }> = {
  atrasado: { chip: 'bg-primor-erro-bg text-primor-erro-ink', fita: 'bg-primor-erro' },
  prazo: { chip: 'bg-primor-sucesso-bg text-primor-sucesso-ink', fita: 'bg-primor-sucesso' },
  atencao: { chip: 'bg-primor-realce text-primor-secondary', fita: 'bg-primor-primary' },
  neutro: { chip: 'bg-primor-paper-deep text-primor-muted', fita: 'bg-primor-line-strong/50' },
  feito: { chip: 'bg-primor-sucesso-bg text-primor-sucesso-ink', fita: 'bg-primor-sucesso/70' },
};

export interface Relogio {
  tom: Tom;
  /** Texto principal, em destaque */
  titulo: string;
  /** Linha de apoio (meta, prazo, próximo toque) */
  detalhe: string | null;
  icone: typeof Clock;
}

/** Como o relógio do card se apresenta. A cor nunca é a única informação. */
export function descreverRelogio(s: Situacao, agora: Date, noExpediente: boolean): Relogio {
  switch (s.tipo) {
    case 'responder':
      return {
        tom: s.atrasado ? 'atrasado' : 'prazo',
        titulo: `Esperando há ${formatarDuracao(s.minutosUteis)}`,
        detalhe: s.atrasado
          ? `passou ${formatarDuracao(s.minutosUteis - META_RESPOSTA_MIN)} da meta${noExpediente ? '' : ' · pausado'}`
          : `no prazo · meta ${META_RESPOSTA_MIN} min${noExpediente ? '' : ' · pausado'}`,
        icone: Clock,
      };
    case 'followup':
      return s.atrasado
        ? {
            tom: 'atrasado',
            titulo: `${s.marco} · atrasado ${formatarDuracao(s.minutos)}`,
            detalhe: 'cobrar retorno do orçamento',
            icone: BellRing,
          }
        : {
            tom: s.minutos <= 24 * 60 ? 'atencao' : 'neutro',
            titulo: `${s.marco} · vence em ${formatarDuracao(s.minutos)}`,
            detalhe: `próximo toque ${descreverQuando(s.vence, agora)}`,
            icone: BellRing,
          };
    case 'esperando':
      return {
        tom: 'neutro',
        titulo: `Com o cliente há ${formatarDuracao((agora.getTime() - s.desde.getTime()) / 60_000)}`,
        detalhe: s.proximoToque ? `próximo toque ${descreverQuando(s.proximoToque, agora)}` : 'toque pendente',
        icone: Hourglass,
      };
    case 'etapa': {
      const naEtapa = s.dias === 0 ? 'Entrou hoje' : `Na etapa há ${s.dias} ${s.dias === 1 ? 'dia' : 'dias'}`;
      const d = s.diasParaInstalacao;
      if (d === null) return { tom: 'neutro', titulo: naEtapa, detalhe: null, icone: CalendarClock };
      const atrasada = d < 0;
      return {
        tom: atrasada ? 'atrasado' : d <= 3 ? 'atencao' : 'neutro',
        titulo: atrasada
          ? `Instalação atrasada ${-d} ${d === -1 ? 'dia' : 'dias'}`
          : d === 0
            ? 'Instalação hoje'
            : `Instalação em ${d} ${d === 1 ? 'dia' : 'dias'}`,
        detalhe: naEtapa.toLowerCase(),
        icone: CalendarClock,
      };
    }
    case 'concluido':
      return {
        tom: 'feito',
        titulo: `Entregue em ${formatarData(s.desde.toISOString())}`,
        detalhe: null,
        icone: Check,
      };
  }
}

/** Ação de contato do card. Só registra no histórico, não envia nada. */
export function acaoDoCard(s: Situacao, esfriando: number | null): { tipo: TipoContato; rotulo: string } | null {
  if (s.tipo === 'responder') return { tipo: 'resposta', rotulo: 'Já respondi' };
  if (s.tipo === 'followup') return { tipo: 'followup', rotulo: 'Já cobrei retorno' };
  if (esfriando !== null && s.tipo === 'esperando') return { tipo: 'retomada', rotulo: 'Já retomei contato' };
  if (s.tipo === 'esperando') return { tipo: 'contato_cliente', rotulo: 'Cliente respondeu' };
  return null;
}

/* ------------------------------------------------------------------ */

interface PropsCard {
  modelo: CardModelo;
  agora: Date;
  noExpediente: boolean;
  compacto: boolean;
  ocupado?: boolean;
  /** Movimento aguardando os 5 s do "Desfazer" */
  pendente?: boolean;
  /** Cópia que segue o dedo/mouse durante o arraste */
  sobreposto?: boolean;
  /** Original que ficou no lugar durante o arraste */
  fantasma?: boolean;
  legado?: boolean;
  onAbrir?: () => void;
  onAcao?: (tipo: TipoContato) => void;
  onMover?: (para: Etapa) => void;
  alca?: {
    ref: (el: HTMLElement | null) => void;
    attributes: DraggableAttributes;
  };
  ouvintes?: DraggableSyntheticListeners;
}

export const CardJornada = forwardRef<HTMLElement, PropsCard & Omit<HTMLAttributes<HTMLElement>, 'onDrag'>>(
  function CardJornada(
    {
      modelo,
      agora,
      noExpediente,
      compacto,
      ocupado = false,
      pendente = false,
      sobreposto = false,
      fantasma = false,
      legado = false,
      onAbrir,
      onAcao,
      onMover,
      alca,
      ouvintes,
      className = '',
      ...resto
    },
    ref,
  ) {
    const { projeto, situacao, esfriando, ultimaMensagem } = modelo;
    const nome = projeto.clients?.nome?.trim() || 'Cliente sem nome';
    const ambiente = projeto.titulo_ambiente?.trim() || null;
    const relogio = descreverRelogio(situacao, agora, noExpediente);
    const acao = legado ? null : acaoDoCard(situacao, esfriando);
    const anterior = etapaVizinha(projeto.status, 'voltar');
    const proxima = etapaVizinha(projeto.status, 'avancar');
    const IconeRelogio = relogio.icone;
    const urgente = relogio.tom === 'atrasado';
    const tomFita = esfriando !== null && relogio.tom === 'neutro' ? 'neutro' : relogio.tom;

    // Clique em qualquer área "vazia" do card abre os detalhes (mouse e toque).
    // Teclado usa o botão com o nome do cliente.
    const aoClicar = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button, a')) return;
      onAbrir?.();
    };

    return (
      <article
        ref={ref}
        {...resto}
        {...ouvintes}
        onClick={sobreposto ? undefined : aoClicar}
        aria-busy={ocupado || undefined}
        className={`card-jornada group/card relative isolate select-none rounded-lg border bg-primor-surface pl-4 pr-1.5 text-left ${
          compacto ? 'pb-2 pt-2' : 'pb-2.5 pt-3'
        } ${
          sobreposto
            ? 'cursor-grabbing border-primor-line-strong shadow-chapa-lg motion-safe:rotate-[-1.5deg] motion-safe:scale-[1.02]'
            : fantasma
              ? 'border-dashed border-primor-line-strong opacity-40 shadow-none'
              : 'cursor-pointer border-primor-line shadow-chapa transition-[border-color,box-shadow,transform] duration-200 hover:border-primor-line-strong motion-safe:hover:-translate-y-px'
        } ${pendente ? 'outline-dashed outline-2 outline-offset-2 outline-primor-primary' : ''} ${className}`}
      >
        {/* Fita de borda: a cor acompanha a urgência do relógio */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-2 left-0 top-2 w-[3px] rounded-r-sm ${CLASSE_TOM[tomFita].fita} ${
            esfriando !== null && tomFita === 'neutro' ? 'opacity-60' : ''
          }`}
        />

        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`card-jornada-avatar mt-0.5 grid shrink-0 place-items-center rounded-md bg-primor-madeira font-display font-semibold text-primor-primary shadow-[inset_0_-2px_0_rgba(0,0,0,0.28)] ${
              compacto ? 'h-8 w-8 text-base' : 'h-10 w-10 text-lg'
            }`}
          >
            {inicial(nome)}
          </span>

          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="leading-snug">
              <button
                type="button"
                onClick={onAbrir}
                tabIndex={sobreposto ? -1 : undefined}
                className="-mx-1 block max-w-full rounded px-1 text-left font-display text-[1.0625rem] font-semibold text-primor-secondary decoration-primor-primary decoration-2 underline-offset-4 hover:underline"
                style={{ fontVariationSettings: "'opsz' 24" }}
              >
                <span className="line-clamp-2 break-words">{nome}</span>
                <span className="sr-only">, abrir detalhes</span>
              </button>
            </h3>
            <p className={`truncate text-sm ${ambiente ? 'text-primor-muted' : 'italic text-primor-placeholder'}`}>
              {ambiente ?? 'Ambiente a definir'}
            </p>
          </div>

          {/* Alça de arraste: ativa o arraste por teclado (espaço/Enter) */}
          {alca ? (
            <button
              type="button"
              ref={alca.ref}
              {...alca.attributes}
              aria-roledescription="card arrastável"
              aria-label={`Mover ${nome}, hoje em ${rotuloEtapa(projeto.status)}`}
              className="btn-icon -mt-1 cursor-grab text-primor-muted hover:bg-primor-paper-deep hover:text-primor-secondary active:cursor-grabbing"
            >
              <GripVertical aria-hidden="true" className="h-5 w-5" />
            </button>
          ) : (
            <span aria-hidden="true" className="btn-icon -mt-1 text-primor-muted">
              <GripVertical className="h-5 w-5" />
            </span>
          )}
        </div>

        {!compacto && ultimaMensagem && (
          <p className="mt-2.5 line-clamp-2 border-l-2 border-primor-line pl-2.5 pr-2 text-[0.8125rem] leading-snug text-primor-secondary">
            <span className="sr-only">Última mensagem do cliente: </span>
            <MessageCircle aria-hidden="true" className="mr-1 inline h-3.5 w-3.5 -translate-y-px text-primor-muted" />
            {ultimaMensagem}
          </p>
        )}

        {/* Relógio / prazo */}
        <div className={`flex flex-wrap items-center gap-1.5 pr-2 ${compacto ? 'mt-2' : 'mt-3'}`}>
          <span
            className={`card-jornada-relogio inline-flex min-h-[28px] max-w-full items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[0.8125rem] font-medium tabular ${CLASSE_TOM[relogio.tom].chip}`}
          >
            <IconeRelogio aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            {relogio.titulo}
          </span>
          {esfriando !== null && (
            <span className="inline-flex min-h-[28px] items-center gap-1 rounded-md border border-dashed border-primor-line-strong px-2 py-0.5 text-xs font-medium text-primor-muted">
              <Snowflake aria-hidden="true" className="h-3.5 w-3.5" />
              Esfriando · {esfriando}d parado
            </span>
          )}
        </div>
        {!compacto && relogio.detalhe && (
          <p className="mt-1 pr-2 text-xs text-primor-muted">{relogio.detalhe}</p>
        )}

        {/* Ação de contato + Voltar/Avançar (alternativa ao arraste) */}
        {/* Sem espaço para os três na mesma linha, Voltar/Avançar descem para a linha de baixo */}
        <div className={`flex flex-wrap items-center gap-1.5 ${compacto ? 'mt-2' : 'mt-3'}`}>
          {acao ? (
            <button
              type="button"
              disabled={ocupado || sobreposto}
              onClick={() => onAcao?.(acao.tipo)}
              className={`btn btn-sm max-w-full flex-auto whitespace-nowrap !gap-1.5 !px-2.5 !text-[0.8125rem] ${urgente ? 'btn-secondary' : 'btn-outline'}`}
            >
              {ocupado ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
              )}
              <span className="truncate">{acao.rotulo}</span>
              <span className="sr-only"> ({nome})</span>
            </button>
          ) : (
            <span className="flex-1 text-xs text-primor-muted">
              {ocupado ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Gravando…
                </span>
              ) : null}
            </span>
          )}
          <div className="ml-auto flex gap-1.5">
          <BotaoMover
            direcao="voltar"
            destino={anterior}
            nome={nome}
            desativado={ocupado || sobreposto}
            onMover={onMover}
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </BotaoMover>
          <BotaoMover
            direcao="avancar"
            destino={proxima}
            nome={nome}
            desativado={ocupado || sobreposto}
            onMover={onMover}
          >
            <ChevronRight aria-hidden="true" className="h-5 w-5" />
          </BotaoMover>
          </div>
        </div>
      </article>
    );
  },
);

function BotaoMover({
  direcao,
  destino,
  nome,
  desativado,
  onMover,
  children,
}: {
  direcao: 'avancar' | 'voltar';
  destino: Etapa | null;
  nome: string;
  desativado: boolean;
  onMover?: (para: Etapa) => void;
  children: ReactNode;
}) {
  const verbo = direcao === 'avancar' ? 'Avançar' : 'Voltar';
  return (
    <button
      type="button"
      disabled={desativado || !destino}
      onClick={() => destino && onMover?.(destino)}
      aria-label={destino ? `${verbo} ${nome} para ${rotuloEtapa(destino)}` : `${verbo}: ${nome} já está na ${direcao === 'avancar' ? 'última' : 'primeira'} etapa`}
      title={destino ? `${verbo} para ${rotuloEtapa(destino)}` : undefined}
      className="btn-icon border border-primor-line text-primor-secondary hover:border-primor-line-strong hover:bg-primor-paper-deep disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/** Card ligado ao dnd-kit. A cópia que segue o ponteiro fica no DragOverlay. */
export function CardArrastavel(
  props: Omit<PropsCard, 'alca' | 'ouvintes' | 'fantasma' | 'sobreposto'> & { desativarArraste?: boolean },
) {
  const { desativarArraste = false, ...resto } = props;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: props.modelo.projeto.id,
    data: { etapa: props.modelo.projeto.status },
    disabled: desativarArraste || props.ocupado,
  });
  return (
    <CardJornada
      {...resto}
      ref={setNodeRef}
      ouvintes={listeners}
      alca={{ ref: setActivatorNodeRef, attributes }}
      fantasma={isDragging}
    />
  );
}
