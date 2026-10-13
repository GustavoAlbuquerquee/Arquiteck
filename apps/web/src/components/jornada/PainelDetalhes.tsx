import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightLeft,
  Bot,
  CalendarDays,
  Check,
  FileText,
  Loader2,
  MessageCircle,
  Phone,
  PhoneIncoming,
  Plus,
  Reply,
  RotateCcw,
  Send,
  Snowflake,
  StickyNote,
  X,
} from 'lucide-react';
import { ETAPAS, rotuloEtapa, type Etapa } from '@/lib/jornada/etapas';
import { carregarHistorico, type EventoJornada, type TipoContato } from '@/lib/jornada/dados';
import { formatarData } from '@/lib/date';
import { Dialogo } from './Dialogo';
import { CLASSE_TOM, acaoDoCard, descreverRelogio, type CardModelo } from './CardJornada';
import { inicial } from './ganchos';

const DESCRICAO_EVENTO: Record<string, { texto: string; icone: typeof Check }> = {
  criado: { texto: 'Card criado', icone: Plus },
  etapa: { texto: 'Mudou de etapa', icone: ArrowRightLeft },
  mensagem: { texto: 'Mensagem do cliente', icone: MessageCircle },
  contato_cliente: { texto: 'Cliente entrou em contato', icone: PhoneIncoming },
  resposta: { texto: 'Equipe respondeu', icone: Reply },
  followup: { texto: 'Equipe cobrou retorno do orçamento', icone: Send },
  retomada: { texto: 'Equipe retomou o contato', icone: RotateCcw },
  nota: { texto: 'Anotação', icone: StickyNote },
};

const ORIGEM: Record<string, string> = { whatsapp: 'WhatsApp', ia: 'Assistente' };

function quando(iso: string) {
  const d = new Date(iso);
  return `${formatarData(iso)} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Link do WhatsApp a partir do telefone salvo (assume Brasil sem DDI) */
function linkWhatsApp(telefone: string) {
  const digitos = telefone.replace(/\D/g, '');
  if (digitos.length < 10) return null;
  return `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}`;
}

export function PainelDetalhes({
  modelo,
  agora,
  noExpediente,
  ocupado,
  legado,
  versaoEventos,
  onFechar,
  onAcao,
  onMover,
}: {
  modelo: CardModelo | null;
  agora: Date;
  noExpediente: boolean;
  ocupado: boolean;
  legado: boolean;
  /** Muda quando um evento novo é gravado, para recarregar a linha do tempo */
  versaoEventos: number;
  onFechar: () => void;
  onAcao: (tipo: TipoContato, mensagem?: string | null) => Promise<boolean>;
  onMover: (para: Etapa) => void;
}) {
  const tituloId = useId();
  const fecharRef = useRef<HTMLButtonElement>(null);
  const [eventos, setEventos] = useState<EventoJornada[] | null>(null);
  const [erroEventos, setErroEventos] = useState(false);
  const [texto, setTexto] = useState('');
  const [tipoTexto, setTipoTexto] = useState<'mensagem' | 'nota'>('mensagem');
  const [destino, setDestino] = useState<Etapa | ''>('');
  const projetoId = modelo?.projeto.id ?? null;

  useEffect(() => {
    setTexto('');
    setDestino('');
  }, [projetoId]);

  useEffect(() => {
    if (!projetoId || legado) {
      setEventos(legado ? [] : null);
      return;
    }
    let ativo = true;
    setErroEventos(false);
    carregarHistorico(projetoId)
      .then((ev) => ativo && setEventos(ev))
      .catch((err) => {
        console.error('Erro ao carregar histórico do card:', err);
        if (ativo) setErroEventos(true);
      });
    return () => {
      ativo = false;
    };
  }, [projetoId, legado, versaoEventos]);

  const p = modelo?.projeto;
  const nome = p?.clients?.nome?.trim() || 'Cliente sem nome';
  const relogio = modelo ? descreverRelogio(modelo.situacao, agora, noExpediente) : null;
  const acaoPrincipal = modelo ? acaoDoCard(modelo.situacao, modelo.esfriando) : null;
  const telefone = p?.clients?.telefone ?? null;
  const whats = telefone ? linkWhatsApp(telefone) : null;

  const contatos: { tipo: TipoContato; rotulo: string; icone: typeof Check }[] = [
    { tipo: 'resposta', rotulo: 'Já respondi', icone: Reply },
    { tipo: 'followup', rotulo: 'Já cobrei retorno', icone: Send },
    { tipo: 'retomada', rotulo: 'Já retomei contato', icone: RotateCcw },
    { tipo: 'contato_cliente', rotulo: 'Cliente entrou em contato', icone: PhoneIncoming },
  ];

  const salvarTexto = async (e: FormEvent) => {
    e.preventDefault();
    const limpo = texto.trim();
    if (!limpo) return;
    if (await onAcao(tipoTexto, limpo)) setTexto('');
  };

  return (
    <Dialogo aberto={Boolean(modelo)} onFechar={onFechar} rotuloId={tituloId} variante="lateral" focoInicial={fecharRef}>
      {modelo && p && relogio && (
        <>
          {/* Cabeçalho */}
          <div className="relative border-b border-primor-line bg-primor-surface px-5 pb-4 pt-5">
            <div className="flex items-start gap-3.5">
              <span
                aria-hidden="true"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primor-madeira font-display text-xl font-semibold text-primor-primary shadow-[inset_0_-2px_0_rgba(0,0,0,0.28)]"
              >
                {inicial(nome)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="etiqueta">{rotuloEtapa(p.status)}</p>
                <h2 id={tituloId} className="mt-0.5 break-words font-display text-2xl font-semibold leading-tight text-primor-secondary">
                  {nome}
                </h2>
                <p className={`text-sm ${p.titulo_ambiente ? 'text-primor-muted' : 'italic text-primor-placeholder'}`}>
                  {p.titulo_ambiente?.trim() || 'Ambiente a definir'}
                </p>
              </div>
              <button
                ref={fecharRef}
                type="button"
                onClick={onFechar}
                aria-label="Fechar detalhes"
                className="btn-icon -mr-2 -mt-2 text-primor-secondary hover:bg-primor-paper-deep"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {telefone && (
                <a href={`tel:${telefone.replace(/[^\d+]/g, '')}`} className="btn btn-outline btn-sm">
                  <Phone aria-hidden="true" className="h-4 w-4" />
                  {telefone}
                </a>
              )}
              {whats && (
                <a href={whats} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                  <MessageCircle aria-hidden="true" className="h-4 w-4" />
                  Abrir conversa
                  <span className="sr-only"> no WhatsApp (abre em nova aba)</span>
                </a>
              )}
              <Link to={`/historico?projetoId=${p.id}`} className="btn btn-quiet btn-sm text-primor-primary-ink">
                <FileText aria-hidden="true" className="h-4 w-4" />
                Briefing no Histórico
              </Link>
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            {/* Relógio */}
            <section aria-labelledby={`${tituloId}-relogio`}>
              <h3 id={`${tituloId}-relogio`} className="etiqueta">
                Agora
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-md px-2.5 font-mono text-sm font-medium tabular ${CLASSE_TOM[relogio.tom].chip}`}>
                  <relogio.icone aria-hidden="true" className="h-4 w-4" />
                  {relogio.titulo}
                </span>
                {modelo.esfriando !== null && (
                  <span className="inline-flex min-h-[32px] items-center gap-1 rounded-md border border-dashed border-primor-line-strong px-2.5 text-sm text-primor-muted">
                    <Snowflake aria-hidden="true" className="h-4 w-4" />
                    Esfriando · {modelo.esfriando} dias parado
                  </span>
                )}
              </div>
              {relogio.detalhe && <p className="mt-1.5 text-sm text-primor-muted">{relogio.detalhe}</p>}
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-primor-muted">Na etapa desde</dt>
                  <dd className="font-mono tabular text-primor-secondary">{p.etapa_desde ? quando(p.etapa_desde) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-primor-muted">Instalação prevista</dt>
                  <dd className="font-mono tabular text-primor-secondary">
                    {p.data_prevista_instalacao ? formatarData(p.data_prevista_instalacao) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-primor-muted">Último contato do cliente</dt>
                  <dd className="font-mono tabular text-primor-secondary">
                    {p.ultimo_contato_cliente_at ? quando(p.ultimo_contato_cliente_at) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-primor-muted">Nosso último contato</dt>
                  <dd className="font-mono tabular text-primor-secondary">
                    {p.ultimo_contato_nosso_at ? quando(p.ultimo_contato_nosso_at) : '—'}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Registrar contato */}
            {!legado && (
              <section aria-labelledby={`${tituloId}-contato`}>
                <h3 id={`${tituloId}-contato`} className="etiqueta">
                  Registrar contato
                </h3>
                <p className="mt-1 text-sm text-primor-muted">
                  Só anota no histórico o que já foi feito. Nada é enviado ao cliente.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {contatos.map(({ tipo, rotulo, icone: Icone }) => (
                    <button
                      key={tipo}
                      type="button"
                      disabled={ocupado}
                      onClick={() => onAcao(tipo)}
                      className={`btn btn-sm justify-start !px-3 text-left !text-[0.8125rem] ${
                        acaoPrincipal?.tipo === tipo ? 'btn-secondary' : 'btn-outline'
                      }`}
                    >
                      <Icone aria-hidden="true" className="h-4 w-4 shrink-0" />
                      {rotulo}
                    </button>
                  ))}
                </div>

                <form onSubmit={salvarTexto} className="mt-4 rounded-lg border border-primor-line bg-primor-surface p-3">
                  <fieldset>
                    <legend className="sr-only">Tipo do registro</legend>
                    <div className="flex gap-1 rounded-md bg-primor-paper-deep p-1">
                      {(
                        [
                          ['mensagem', 'Mensagem do cliente'],
                          ['nota', 'Anotação interna'],
                        ] as const
                      ).map(([valor, rotulo]) => (
                        <label
                          key={valor}
                          className={`flex min-h-[40px] flex-1 cursor-pointer items-center justify-center rounded px-2 text-center text-sm font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primor-secondary ${
                            tipoTexto === valor ? 'bg-primor-surface text-primor-secondary shadow-chapa' : 'text-primor-muted'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`${tituloId}-tipo`}
                            value={valor}
                            checked={tipoTexto === valor}
                            onChange={() => setTipoTexto(valor)}
                            className="sr-only"
                          />
                          {rotulo}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label htmlFor={`${tituloId}-texto`} className="sr-only">
                    {tipoTexto === 'mensagem' ? 'Texto da mensagem do cliente' : 'Texto da anotação'}
                  </label>
                  <textarea
                    id={`${tituloId}-texto`}
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder={
                      tipoTexto === 'mensagem'
                        ? 'Cole aqui o que o cliente escreveu'
                        : 'Ex.: prefere contato depois das 14h'
                    }
                    className="field mt-2 resize-y"
                  />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-primor-muted">
                      {tipoTexto === 'mensagem' ? 'Aparece no card e liga o relógio de resposta.' : 'Fica só no histórico.'}
                    </p>
                    <button type="submit" disabled={ocupado || !texto.trim()} className="btn btn-primary btn-sm shrink-0">
                      {ocupado ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
                      Registrar
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Mover (alternativa ao arraste) */}
            <section aria-labelledby={`${tituloId}-mover`}>
              <h3 id={`${tituloId}-mover`} className="etiqueta">
                Mover para outra etapa
              </h3>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (destino && destino !== p.status) onMover(destino);
                }}
              >
                <label htmlFor={`${tituloId}-destino`} className="sr-only">
                  Etapa de destino
                </label>
                <select
                  id={`${tituloId}-destino`}
                  value={destino}
                  onChange={(e) => setDestino(e.target.value as Etapa | '')}
                  className="field min-w-0 flex-1"
                >
                  <option value="">Escolha a etapa…</option>
                  {ETAPAS.map((e, i) => (
                    <option key={e.id} value={e.id} disabled={e.id === p.status}>
                      {String(i + 1).padStart(2, '0')} · {e.rotulo}
                      {e.id === p.status ? ' (atual)' : e.avisaCliente ? ' · avisa o cliente' : ''}
                    </option>
                  ))}
                </select>
                <button type="submit" disabled={!destino || ocupado} className="btn btn-secondary shrink-0">
                  Mover
                </button>
              </form>
            </section>

            {/* Linha do tempo */}
            <section aria-labelledby={`${tituloId}-historico`}>
              <h3 id={`${tituloId}-historico`} className="etiqueta">
                Linha do tempo
              </h3>
              {legado ? (
                <p className="mt-2 text-sm text-primor-muted">
                  O histórico aparece depois que o banco for atualizado com a migração da jornada.
                </p>
              ) : erroEventos ? (
                <p role="alert" className="alerta alerta-erro mt-2">
                  Não foi possível carregar o histórico.
                </p>
              ) : eventos === null ? (
                <div role="status" aria-label="Carregando histórico" className="mt-3 space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="esqueleto h-10 w-full" />
                  ))}
                </div>
              ) : eventos.length === 0 ? (
                <p className="mt-2 text-sm text-primor-muted">Nenhum registro ainda.</p>
              ) : (
                <ol className="relative mt-3 space-y-4 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-primor-line">
                  {eventos.map((ev) => {
                    const desc = DESCRICAO_EVENTO[ev.tipo] ?? { texto: ev.tipo, icone: CalendarDays };
                    const Icone = ev.origem === 'ia' ? Bot : desc.icone;
                    const texto =
                      ev.tipo === 'etapa'
                        ? `${rotuloEtapa(ev.de_etapa)} → ${rotuloEtapa(ev.para_etapa)}`
                        : ev.tipo === 'criado'
                          ? `Card criado em ${rotuloEtapa(ev.para_etapa)}`
                          : desc.texto;
                    return (
                      <li key={ev.id} className="relative flex gap-3">
                        <span
                          aria-hidden="true"
                          className={`relative z-[1] grid h-8 w-8 shrink-0 place-items-center rounded-full border ${
                            ev.tipo === 'mensagem' || ev.tipo === 'contato_cliente'
                              ? 'border-primor-primary bg-primor-realce text-primor-primary-ink'
                              : 'border-primor-line bg-primor-surface text-primor-muted'
                          }`}
                        >
                          <Icone className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1 pt-1">
                          <p className="text-sm font-medium text-primor-secondary">
                            {texto}
                            {ORIGEM[ev.origem] && (
                              <span className="ml-2 rounded bg-primor-paper-deep px-1.5 py-0.5 align-middle font-mono text-[10px] uppercase tracking-wider text-primor-muted">
                                {ORIGEM[ev.origem]}
                              </span>
                            )}
                          </p>
                          {ev.mensagem && (
                            <p className="mt-1 whitespace-pre-line break-words rounded-md border-l-2 border-primor-line bg-primor-surface px-2.5 py-1.5 text-sm text-primor-secondary">
                              {ev.mensagem}
                            </p>
                          )}
                          <p className="mt-0.5 font-mono text-xs text-primor-muted tabular">
                            {quando(ev.created_at)}
                            {ev.profiles?.nome_completo ? ` · ${ev.profiles.nome_completo}` : ''}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </Dialogo>
  );
}
