import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CircleCheck, CirclePause, Lightbulb, TriangleAlert } from 'lucide-react';
import { ETAPAS, FAIXAS, type Etapa } from '@/lib/jornada/etapas';
import {
  EXPEDIENTE,
  META_RESPOSTA_MIN,
  descreverQuando,
  formatarDuracao,
  proximaAbertura,
  DIAS_ESFRIANDO,
} from '@/lib/jornada/relogios';
import type { Alerta, Metricas } from '@/lib/jornada/metricas';
import { primeiroNome } from './ganchos';

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
export const TEXTO_EXPEDIENTE = `${hhmm(EXPEDIENTE.inicioMin)}–${hhmm(EXPEDIENTE.fimMin)}`;

/* ------------------------------------------------------------------
   Ao vivo / fora do expediente
   ------------------------------------------------------------------ */

export function IndicadorAoVivo({ agora, noExpediente }: { agora: Date; noExpediente: boolean }) {
  if (noExpediente) {
    return (
      <p className="inline-flex min-h-[40px] items-center gap-2.5 rounded-full border border-primor-line bg-primor-surface px-3.5 text-sm text-primor-secondary shadow-chapa">
        <span aria-hidden="true" className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-primor-sucesso opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primor-sucesso" />
        </span>
        <span>
          <strong className="font-semibold">Ao vivo</strong>
          <span className="text-primor-muted"> · relógios contando · meta {META_RESPOSTA_MIN} min</span>
        </span>
      </p>
    );
  }
  return (
    <p className="inline-flex min-h-[40px] items-center gap-2.5 rounded-full border border-dashed border-primor-line-strong bg-primor-surface px-3.5 text-sm text-primor-secondary">
      <CirclePause aria-hidden="true" className="h-4 w-4 text-primor-muted" />
      <span>
        <strong className="font-semibold">Fora do expediente</strong>
        <span className="text-primor-muted">
          {' '}
          · relógios pausados até {descreverQuando(proximaAbertura(agora), agora)}
        </span>
      </span>
    </p>
  );
}

/* ------------------------------------------------------------------
   Faixa de alerta
   ------------------------------------------------------------------ */

export function FaixaAlerta({
  alerta,
  temCards,
  legado,
  onAbrir,
}: {
  alerta: Alerta | null;
  temCards: boolean;
  legado: boolean;
  onAbrir: (projectId: string) => void;
}) {
  // Leitor de tela: anuncia só quando a quantidade muda, não a cada minuto
  const [anuncio, setAnuncio] = useState('');
  const chave = alerta ? `${alerta.tipo}:${alerta.quantidade}` : 'ok';
  const anterior = useRef<string | null>(null);
  useEffect(() => {
    if (anterior.current !== null && anterior.current !== chave) {
      setAnuncio(
        alerta
          ? alerta.tipo === 'resposta'
            ? `${alerta.quantidade} ${alerta.quantidade === 1 ? 'cliente passou' : 'clientes passaram'} do prazo de resposta.`
            : `${alerta.quantidade} ${alerta.quantidade === 1 ? 'follow-up atrasado' : 'follow-ups atrasados'}.`
          : 'Nenhum cliente esperando além do prazo.',
      );
    }
    anterior.current = chave;
  }, [chave, alerta]);

  const regiao = (
    <p aria-live="polite" className="sr-only">
      {anuncio}
    </p>
  );

  if (legado || !temCards) return regiao;

  if (!alerta) {
    return (
      <>
        {regiao}
        <div className="flex min-h-[48px] items-center gap-3 rounded-lg border border-primor-sucesso/30 bg-primor-sucesso-bg px-4 py-2.5 text-sm text-primor-sucesso-ink">
          <CircleCheck aria-hidden="true" className="h-5 w-5 shrink-0" />
          <p>
            <strong className="font-semibold">Tudo em dia.</strong> Nenhum cliente esperando além do prazo de resposta.
          </p>
        </div>
      </>
    );
  }

  const nome = primeiroNome(alerta.pior.nome);
  const n = alerta.quantidade;
  return (
    <>
      {regiao}
      <div className="relative flex flex-col gap-3 overflow-hidden rounded-lg border border-primor-erro/40 bg-primor-erro-bg py-3 pl-5 pr-3 text-primor-erro-ink sm:flex-row sm:items-center">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-primor-erro" />
        <TriangleAlert aria-hidden="true" className="hidden h-5 w-5 shrink-0 sm:block" />
        <p className="min-w-0 flex-1 text-[0.9375rem] leading-relaxed">
          {alerta.tipo === 'resposta' ? (
            <>
              <strong className="font-semibold">
                {n} {n === 1 ? 'cliente passou' : 'clientes passaram'} do prazo de resposta.
              </strong>{' '}
              {n > 1 ? 'O caso mais grave: ' : ''}
              <strong className="font-semibold">{nome}</strong> espera há{' '}
              <strong className="font-mono font-semibold tabular">{formatarDuracao(alerta.minutos)}</strong>.{' '}
              {n > 1 ? 'Resolva esse primeiro.' : 'Responda agora.'}
            </>
          ) : (
            <>
              <strong className="font-semibold">
                {n} {n === 1 ? 'follow-up de orçamento atrasado.' : 'follow-ups de orçamento atrasados.'}
              </strong>{' '}
              {n > 1 ? 'O mais antigo: ' : ''}
              <strong className="font-semibold">{nome}</strong>, atrasado{' '}
              <strong className="font-mono font-semibold tabular">{formatarDuracao(alerta.minutos)}</strong>.{' '}
              {n > 1 ? 'Cobre esse primeiro.' : 'Cobre o retorno hoje.'}
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => onAbrir(alerta.pior.id)}
          className="btn btn-sm shrink-0 self-start border-[1.5px] border-primor-erro/50 bg-primor-surface text-primor-erro-ink hover:bg-primor-paper-deep sm:self-auto"
        >
          Abrir {nome}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------
   Métricas
   ------------------------------------------------------------------ */

export function LinhaMetricas({ metricas, legado }: { metricas: Metricas; legado: boolean }) {
  const semDado = legado ? 'aguardando a atualização do banco' : 'sem respostas registradas ainda';
  const itens = [
    {
      rotulo: 'Tempo médio de resposta',
      valor: metricas.tempoMedioResposta === null ? '—' : formatarDuracao(metricas.tempoMedioResposta),
      apoio: metricas.tempoMedioResposta === null ? semDado : `últimos 30 dias · meta ${META_RESPOSTA_MIN} min`,
      ruim: metricas.tempoMedioResposta !== null && metricas.tempoMedioResposta > META_RESPOSTA_MIN,
    },
    {
      rotulo: 'Respostas no prazo',
      valor: metricas.percentualNoPrazo === null ? '—' : `${metricas.percentualNoPrazo}%`,
      apoio:
        metricas.percentualNoPrazo === null
          ? semDado
          : `${Math.round((metricas.percentualNoPrazo / 100) * metricas.respostasNaJanela)} de ${metricas.respostasNaJanela} em até ${META_RESPOSTA_MIN} min`,
      ruim: metricas.percentualNoPrazo !== null && metricas.percentualNoPrazo < 80,
    },
    {
      rotulo: 'Esperando agora',
      valor: legado ? '—' : String(metricas.esperandoAgora),
      apoio: metricas.esperandoAgora === 1 ? 'cliente aguardando resposta' : 'clientes aguardando resposta',
      ruim: false,
    },
    {
      rotulo: 'Tarefas em aberto',
      valor: legado ? '—' : String(metricas.tarefasAbertas),
      apoio: 'responder, cobrar ou retomar',
      ruim: false,
    },
  ];
  return (
    <section aria-label="Indicadores de atendimento" className="panel overflow-hidden">
      <dl className="grid grid-cols-2 lg:grid-cols-4">
        {itens.map((m, i) => (
          <div
            key={m.rotulo}
            className={`px-4 py-4 sm:px-6 sm:py-5 ${i % 2 === 1 ? 'border-l border-primor-line' : ''} ${
              i >= 2 ? 'border-t border-primor-line lg:border-t-0' : ''
            } ${i === 2 ? 'lg:border-l' : ''}`}
          >
            <dt className="etiqueta">{m.rotulo}</dt>
            <dd className="mt-2">
              <span
                className={`block font-mono text-[1.75rem] font-medium leading-none tracking-tight tabular sm:text-[2rem] ${
                  m.ruim ? 'text-primor-erro' : 'text-primor-secondary'
                }`}
              >
                {m.valor}
              </span>
              <span className="mt-2 block text-xs leading-snug text-primor-muted">{m.apoio}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ------------------------------------------------------------------
   Dica de uso
   ------------------------------------------------------------------ */

const ETAPAS_QUE_AVISAM = ETAPAS.filter((e) => e.avisaCliente).map((e) => e.rotulo);
const listaNatural = (itens: string[]) =>
  itens.length > 1 ? `${itens.slice(0, -1).join(', ')} ou ${itens[itens.length - 1]}` : itens[0] ?? '';

export function DicaBoard({ aberta, onAlternar }: { aberta: boolean; onAlternar: (aberta: boolean) => void }) {
  return (
    <details
      open={aberta}
      onToggle={(e) => onAlternar((e.currentTarget as HTMLDetailsElement).open)}
      className="group rounded-lg border border-primor-line bg-primor-realce/60"
    >
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2.5 rounded-lg px-4 text-sm font-semibold text-primor-secondary [&::-webkit-details-marker]:hidden">
        <Lightbulb aria-hidden="true" className="h-4 w-4 text-primor-primary-ink" />
        Como usar o board
        <span className="ml-auto font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-primor-muted">
          <span className="group-open:hidden">mostrar</span>
          <span className="hidden group-open:inline">ocultar</span>
        </span>
      </summary>
      <ul className="grid gap-x-8 gap-y-2.5 px-4 pb-4 pt-1 text-sm leading-relaxed text-primor-secondary md:grid-cols-2">
        <li>
          <strong className="font-semibold">Arraste o card</strong> para a etapa em que o cliente está, ou use as
          setas ‹ › do card. Pelo teclado: foque a alça ⋮⋮, aperte espaço, escolha a etapa com as setas e aperte
          espaço de novo.
        </li>
        <li>
          Mover para {listaNatural(ETAPAS_QUE_AVISAM)} <strong className="font-semibold">avisa o cliente pelo
          WhatsApp</strong>. Você tem 5 segundos para desfazer antes de o aviso sair.
        </li>
        <li>
          <strong className="font-semibold">“Já respondi”, “Já cobrei retorno” e “Já retomei contato”</strong> só
          registram o que você já fez pelo seu WhatsApp ou telefone. <strong className="font-semibold">Eles não
          mandam nada ao cliente.</strong>
        </li>
        <li>
          Os relógios contam só no expediente ({TEXTO_EXPEDIENTE}, de segunda a sexta). Meta de resposta:{' '}
          {META_RESPOSTA_MIN} min. Orçamento enviado é cobrado em D+1, D+3 e D+7. Card de venda parado há{' '}
          {DIAS_ESFRIANDO} dias ou mais está <strong className="font-semibold">esfriando</strong>.
        </li>
      </ul>
    </details>
  );
}

/* ------------------------------------------------------------------
   Mini-mapa da jornada: a trena com as 9 etapas
   ------------------------------------------------------------------ */

export function MiniMapa({
  contagem,
  atrasados,
  ocultas,
  onIr,
}: {
  contagem: Record<string, number>;
  atrasados: Record<string, number>;
  /** Etapas fora da faixa visível agora */
  ocultas: Set<Etapa>;
  onIr: (etapa: Etapa) => void;
}) {
  let numero = 0;
  return (
    <nav aria-label="Mapa da jornada: ir para uma etapa" className="panel min-w-0 px-2 pb-2 pt-3 sm:px-4">
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin] sm:gap-5">
        {FAIXAS.map((faixa) => {
          const etapas = ETAPAS.filter((e) => e.faixa === faixa.id);
          return (
            <div key={faixa.id} className="min-w-fit flex-1" style={{ flexGrow: etapas.length }}>
              <p className="etiqueta px-1">{faixa.rotulo}</p>
              <ol className="relative mt-1 flex">
                {/* fita da trena passando pelos marcos */}
                <span
                  aria-hidden="true"
                  className="trena absolute top-[1.125rem] h-1.5 -translate-y-1/2 rounded-[2px]"
                  style={{
                    left: `calc(100% / ${etapas.length} / 2)`,
                    right: `calc(100% / ${etapas.length} / 2)`,
                  }}
                />
                {etapas.map((etapa) => {
                  numero += 1;
                  const n = contagem[etapa.id] ?? 0;
                  const a = atrasados[etapa.id] ?? 0;
                  const oculta = ocultas.has(etapa.id);
                  return (
                    <li key={etapa.id} className="flex min-w-[3.25rem] flex-1 justify-center">
                      <button
                        type="button"
                        onClick={() => onIr(etapa.id)}
                        className="group relative flex min-h-[44px] w-full flex-col items-center rounded-md px-0.5 pb-1.5 pt-2 text-center hover:bg-primor-paper-deep"
                      >
                        <span
                          aria-hidden="true"
                          className={`relative block h-4 w-4 rounded-full border-2 ${
                            n > 0
                              ? 'border-primor-secondary bg-primor-secondary'
                              : 'border-primor-line-strong bg-primor-surface'
                          }`}
                        >
                          {a > 0 && (
                            <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primor-surface bg-primor-erro" />
                          )}
                        </span>
                        <span className="mt-1.5 font-mono text-[10px] text-primor-muted tabular" aria-hidden="true">
                          {String(numero).padStart(2, '0')}
                        </span>
                        <span
                          className={`block max-w-full truncate text-[11px] leading-tight sm:text-xs ${
                            oculta ? 'text-primor-muted' : 'font-medium text-primor-secondary'
                          } group-hover:underline group-hover:decoration-primor-primary group-hover:underline-offset-4`}
                        >
                          <span className="sr-only">{etapa.rotulo}</span>
                          <span aria-hidden="true" className="hidden xl:inline">{etapa.rotulo}</span>
                          <span aria-hidden="true" className="xl:hidden">{etapa.curto}</span>
                        </span>
                        <span className="mt-0.5 font-mono text-base font-medium leading-none text-primor-secondary tabular sm:text-lg">
                          <span className="sr-only">: </span>
                          {n}
                          <span className="sr-only">
                            {' '}
                            {n === 1 ? 'card' : 'cards'}
                            {a > 0 ? `, ${a} atrasado${a > 1 ? 's' : ''}` : ''}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
