import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  defaultDropAnimationSideEffects,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { RefreshCw, Rows3, Search, UserPlus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ETAPAS,
  FAIXAS,
  ORDEM_ETAPAS,
  definicaoEtapa,
  rotuloEtapa,
  type Etapa,
  type Faixa,
} from '@/lib/jornada/etapas';
import {
  calcularProximoFollowup,
  diasEsfriando,
  estaNoExpediente,
  pesoUrgencia,
  situacaoDoCard,
  type Situacao,
} from '@/lib/jornada/relogios';
import { alertaPrincipal, calcularMetricas, type CardParaMetrica } from '@/lib/jornada/metricas';
import {
  carregarBoard,
  criarLead,
  etapaAvisaCliente,
  gravarEtapa,
  notificarMudancaDeEtapa,
  podeAvisarCliente,
  registrarContato,
  type EventoJornada,
  type ProjetoJornada,
  type TipoContato,
} from '@/lib/jornada/dados';
import { CSS_CARD, CardArrastavel, CardJornada, type CardModelo } from '@/components/jornada/CardJornada';
import { ColunaJornada, FaixaJornada, idColuna, idElementoColuna } from '@/components/jornada/FaixaJornada';
import { DicaBoard, FaixaAlerta, IndicadorAoVivo, LinhaMetricas, MiniMapa } from '@/components/jornada/TopoJornada';
import { PainelDetalhes } from '@/components/jornada/PainelDetalhes';
import { NovoContato } from '@/components/jornada/NovoContato';
import { AvisosJornada, type MovimentoPendente } from '@/components/jornada/AvisosJornada';
import { useAgora, useMenosMovimento, usePreferencia } from '@/components/jornada/ganchos';

type FiltroRapido = 'todos' | 'responder' | 'atrasados' | 'esfriando';
type FaixaVisivel = 'tudo' | Faixa;

const LIMITE_CONCLUIDOS = 8;

const ROTULO_CONTATO: Record<TipoContato, string> = {
  resposta: 'resposta ao cliente',
  followup: 'cobrança de retorno',
  retomada: 'retomada de contato',
  contato_cliente: 'contato do cliente',
  mensagem: 'mensagem do cliente',
  nota: 'anotação',
};

const etapaDaColuna = (id: UniqueIdentifier | undefined | null) =>
  typeof id === 'string' && id.startsWith('coluna:') ? (id.slice(7) as Etapa) : null;

const nomeDe = (p: ProjetoJornada | undefined) => p?.clients?.nome?.trim() || 'Cliente sem nome';

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Teclado: setas esquerda/direita levam o card para a etapa anterior/seguinte
 * que estiver na tela; cima/baixo trocam de faixa (Venda ↔ Execução).
 */
const coordenadasTeclado: KeyboardCoordinateGetter = (event, { context }) => {
  const { active, collisionRect, droppableContainers, over } = context;
  const direcoes = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'];
  if (!direcoes.includes(event.code) || !active || !collisionRect) return undefined;
  event.preventDefault();

  const colunas = droppableContainers
    .getEnabled()
    .map((c) => ({ etapa: etapaDaColuna(c.id), node: c.node.current }))
    .filter((c): c is { etapa: Etapa; node: HTMLElement } => Boolean(c.etapa && c.node))
    .sort((a, b) => ORDEM_ETAPAS.indexOf(a.etapa) - ORDEM_ETAPAS.indexOf(b.etapa));
  const atual = etapaDaColuna(over?.id) ?? (active.data.current?.etapa as Etapa | undefined);
  const i = colunas.findIndex((c) => c.etapa === atual);
  if (i < 0) return undefined;

  let alvo: HTMLElement | undefined;
  if (event.code === 'ArrowRight') alvo = colunas[i + 1]?.node;
  else if (event.code === 'ArrowLeft') alvo = colunas[i - 1]?.node;
  else {
    const daqui = colunas[i].node.getBoundingClientRect();
    const cx = daqui.left + daqui.width / 2;
    const candidatos = colunas
      .filter((_, j) => j !== i)
      .map((c) => ({ node: c.node, r: c.node.getBoundingClientRect() }))
      .filter(({ r }) => (event.code === 'ArrowDown' ? r.top >= daqui.bottom - 4 : r.bottom <= daqui.top + 4))
      .sort(
        (a, b) =>
          Math.abs(a.r.left + a.r.width / 2 - cx) - Math.abs(b.r.left + b.r.width / 2 - cx) ||
          (event.code === 'ArrowDown' ? a.r.top - b.r.top : b.r.top - a.r.top),
      );
    alvo = candidatos[0]?.node ?? (event.code === 'ArrowDown' ? colunas[i + 1]?.node : colunas[i - 1]?.node);
  }
  if (!alvo) return undefined;

  // Traz a coluna para a tela antes de medir (trilho com rolagem horizontal)
  alvo.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const r = alvo.getBoundingClientRect();
  return {
    x: r.left + r.width / 2 - collisionRect.width / 2,
    y: r.top + Math.min(r.height / 2, 80) - collisionRect.height / 2 + 24,
  };
};

/** Ponteiro: a coluna sob o dedo/mouse. Teclado: a coluna que o card mais cobre. */
const deteccaoColisao: CollisionDetection = (args) => {
  const sobPonteiro = pointerWithin(args);
  return sobPonteiro.length ? sobPonteiro : rectIntersection(args);
};

export function Producao() {
  const { user } = useAuth();
  const agora = useAgora();
  const menosMovimento = useMenosMovimento();

  const [projetos, setProjetos] = useState<ProjetoJornada[]>([]);
  const [eventos, setEventos] = useState<EventoJornada[]>([]);
  const [legado, setLegado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  // Cards com gravação em andamento (mesmo papel do antigo `updating`)
  const [updating, setUpdating] = useState<string[]>([]);
  const [pendente, setPendente] = useState<MovimentoPendente | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [versaoEventos, setVersaoEventos] = useState(0);
  const [novoAberto, setNovoAberto] = useState(false);
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroRapido>('todos');
  const [destacada, setDestacada] = useState<Etapa | null>(null);
  const [todosConcluidos, setTodosConcluidos] = useState(false);
  const [faixa, setFaixa] = usePreferencia<FaixaVisivel>('arquiteck-jornada-faixa', 'tudo', ['tudo', 'venda', 'execucao']);
  const [densidade, setDensidade] = usePreferencia('arquiteck-jornada-densidade', 'confortavel', ['confortavel', 'compacto']);
  const [dica, setDica] = usePreferencia(
    'arquiteck-jornada-dica',
    // No celular a dica começa fechada para o board aparecer logo
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'fechada' : 'aberta',
    ['aberta', 'fechada'],
  );
  const compacto = densidade === 'compacto';

  // Refs para os callbacks assíncronos lerem o estado atual
  const pendenteRef = useRef<{ mov: MovimentoPendente; anterior: ProjetoJornada } | null>(null);
  const legadoRef = useRef(legado);
  legadoRef.current = legado;
  const ocupadoRef = useRef(false);
  ocupadoRef.current = Boolean(arrastandoId) || updating.length > 0;

  /* ---------------- Carga e atualização ao vivo ---------------- */

  const aplicarPendente = (lista: ProjetoJornada[]) => {
    const p = pendenteRef.current;
    return p ? lista.map((x) => (x.id === p.mov.projetoId ? { ...x, status: p.mov.para } : x)) : lista;
  };

  const carregar = useCallback(async (silencioso = false) => {
    try {
      const dados = await carregarBoard();
      setProjetos(aplicarPendente(dados.projetos));
      setEventos(dados.eventos);
      setLegado(dados.legado);
      setErroCarga(null);
    } catch (err) {
      console.error('Erro ao carregar projetos:', err);
      if (!silencioso) setErroCarga('Não foi possível carregar a jornada. Confira a conexão e tente de novo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) carregar();
  }, [user, carregar]);

  // Ao vivo: relê os dados a cada minuto com a aba visível, sem atrapalhar um arraste
  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !ocupadoRef.current) carregar(true);
    }, 60_000);
    return () => window.clearInterval(id);
  }, [user, carregar]);

  /* ---------------- Modelos dos cards ---------------- */

  const ultimaMensagem = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const e of eventos) if (e.tipo === 'mensagem' && e.mensagem) mapa.set(e.project_id, e.mensagem);
    return mapa;
  }, [eventos]);

  const cobrancas = useMemo(() => {
    const mapa = new Map<string, string[]>();
    for (const e of eventos) {
      if (e.tipo !== 'followup') continue;
      const lista = mapa.get(e.project_id);
      if (lista) lista.push(e.created_at);
      else mapa.set(e.project_id, [e.created_at]);
    }
    return mapa;
  }, [eventos]);

  const toquesFollowup = useCallback(
    (p: ProjetoJornada) => {
      const desde = p.etapa_desde ? new Date(p.etapa_desde).getTime() : 0;
      return (cobrancas.get(p.id) ?? []).filter((d) => new Date(d).getTime() >= desde).length;
    },
    [cobrancas],
  );

  const modelos = useMemo<CardModelo[]>(
    () =>
      projetos.map((p) => {
        const toques = toquesFollowup(p);
        // Sem a migração não há registro de contato: só o tempo na etapa
        const situacao: Situacao =
          legado && p.status !== 'concluido'
            ? situacaoDoCard({ ...p, status: 'producao', ultimo_contato_cliente_at: null }, agora)
            : situacaoDoCard(p, agora, toques);
        const esfriando = legado ? null : diasEsfriando(p, agora);
        return {
          projeto: p,
          situacao,
          esfriando,
          ultimaMensagem: ultimaMensagem.get(p.id) ?? null,
          toquesFollowup: toques,
          peso: pesoUrgencia(situacao, esfriando, agora),
        };
      }),
    [projetos, agora, legado, toquesFollowup, ultimaMensagem],
  );

  const porId = useMemo(() => new Map(modelos.map((m) => [m.projeto.id, m])), [modelos]);
  const noExpediente = estaNoExpediente(agora);

  const atrasado = (m: CardModelo) =>
    ((m.situacao.tipo === 'responder' || m.situacao.tipo === 'followup') && m.situacao.atrasado) ||
    (m.situacao.tipo === 'etapa' && m.situacao.diasParaInstalacao !== null && m.situacao.diasParaInstalacao < 0);

  const cardsMetrica = useMemo<CardParaMetrica[]>(
    () =>
      modelos.map((m) => ({
        id: m.projeto.id,
        nome: nomeDe(m.projeto),
        situacao: m.situacao,
        esfriando: m.esfriando,
      })),
    [modelos],
  );
  const metricas = useMemo(() => calcularMetricas(eventos, cardsMetrica, agora), [eventos, cardsMetrica, agora]);
  const alerta = legado ? null : alertaPrincipal(cardsMetrica);

  const contagem: Record<string, number> = {};
  const atrasadosPorEtapa: Record<string, number> = {};
  for (const m of modelos) {
    contagem[m.projeto.status] = (contagem[m.projeto.status] ?? 0) + 1;
    if (atrasado(m)) atrasadosPorEtapa[m.projeto.status] = (atrasadosPorEtapa[m.projeto.status] ?? 0) + 1;
  }
  const quantFiltro = {
    responder: modelos.filter((m) => m.situacao.tipo === 'responder').length,
    atrasados: modelos.filter(atrasado).length,
    esfriando: modelos.filter((m) => m.esfriando !== null).length,
  };

  /* ---------------- Filtros ---------------- */

  const termo = normalizar(busca.trim());
  const visiveis = modelos.filter((m) => {
    if (termo) {
      const alvo = normalizar(
        `${m.projeto.clients?.nome ?? ''} ${m.projeto.titulo_ambiente ?? ''} ${m.projeto.clients?.telefone ?? ''}`,
      );
      if (!alvo.includes(termo)) return false;
    }
    if (filtro === 'responder') return m.situacao.tipo === 'responder';
    if (filtro === 'atrasados') return atrasado(m);
    if (filtro === 'esfriando') return m.esfriando !== null;
    return true;
  });
  const filtrando = Boolean(termo) || filtro !== 'todos';

  const colunas = useMemo(() => {
    const mapa = new Map<Etapa, CardModelo[]>(ORDEM_ETAPAS.map((e) => [e, []]));
    for (const m of visiveis) mapa.get(m.projeto.status)?.push(m);
    for (const lista of mapa.values()) lista.sort((a, b) => b.peso - a.peso);
    return mapa;
  }, [visiveis]);

  /* ---------------- Mover entre etapas (com desfazer) ---------------- */

  const gravar = async (mov: MovimentoPendente, anterior: ProjetoJornada) => {
    setUpdating((u) => [...u, mov.projetoId]);
    try {
      const mudancas = await gravarEtapa(anterior, mov.de, mov.para, new Date(), legadoRef.current);
      setProjetos((prev) => prev.map((p) => (p.id === mov.projetoId ? { ...p, ...mudancas } : p)));
      // Aviso ao cliente em segundo plano: não segura a tela
      notificarMudancaDeEtapa(anterior, mov.de, mov.para);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setProjetos((prev) => prev.map((p) => (p.id === mov.projetoId ? restaurar(p, anterior) : p)));
      setErro(
        `Não foi possível mover ${mov.nome} para ${rotuloEtapa(mov.para)}. O card voltou para ${rotuloEtapa(mov.de)}.`,
      );
    } finally {
      setUpdating((u) => u.filter((id) => id !== mov.projetoId));
    }
  };

  const restaurar = (atual: ProjetoJornada, anterior: ProjetoJornada): ProjetoJornada => ({
    ...atual,
    status: anterior.status,
    etapa_desde: anterior.etapa_desde,
    ultimo_contato_nosso_at: anterior.ultimo_contato_nosso_at,
    proximo_followup_at: anterior.proximo_followup_at,
  });

  const confirmarPendente = () => {
    const atual = pendenteRef.current;
    if (!atual) return;
    pendenteRef.current = null;
    setPendente(null);
    void gravar(atual.mov, atual.anterior);
  };
  const confirmarRef = useRef(confirmarPendente);
  confirmarRef.current = confirmarPendente;

  const mover = (projeto: ProjetoJornada, para: Etapa) => {
    if (updating.includes(projeto.id)) return;
    const jaPendente = pendenteRef.current?.mov.projetoId === projeto.id ? pendenteRef.current : null;
    if (!jaPendente) confirmarPendente();
    const anterior = jaPendente?.anterior ?? projeto;
    const nome = nomeDe(projeto);

    // Voltou para onde estava antes do toast: é o mesmo que desfazer
    if (para === anterior.status) {
      if (jaPendente) desfazer();
      return;
    }

    const agoraIso = new Date().toISOString();
    const mov: MovimentoPendente = {
      chave: Date.now(),
      projetoId: projeto.id,
      nome,
      de: anterior.status,
      para,
      avisa: etapaAvisaCliente(para) && podeAvisarCliente(projeto),
    };
    pendenteRef.current = { mov, anterior };
    setPendente(mov);
    setProjetos((prev) =>
      prev.map((p) => {
        if (p.id !== projeto.id) return p;
        const base = restaurar(p, anterior);
        const local: ProjetoJornada = { ...base, status: para, etapa_desde: agoraIso };
        if (!legadoRef.current && para === 'orcamento') {
          local.ultimo_contato_nosso_at = agoraIso;
          local.proximo_followup_at = calcularProximoFollowup(new Date(agoraIso), 0)!.toISOString();
        } else if (anterior.status === 'orcamento') {
          local.proximo_followup_at = null;
        }
        return local;
      }),
    );
  };

  const desfazer = () => {
    const atual = pendenteRef.current;
    if (!atual) return;
    pendenteRef.current = null;
    setPendente(null);
    setProjetos((prev) => prev.map((p) => (p.id === atual.mov.projetoId ? restaurar(p, atual.anterior) : p)));
    setMensagem(`Desfeito. ${atual.mov.nome} voltou para ${rotuloEtapa(atual.mov.de)}.`);
  };
  const fecharErro = useCallback(() => setErro(null), []);
  const desfazerRef = useRef(desfazer);
  desfazerRef.current = desfazer;

  // Ctrl+Z / Cmd+Z desfaz enquanto o toast está na tela
  useEffect(() => {
    if (!pendente) return;
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        desfazerRef.current();
      }
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [pendente]);

  // Saindo da tela (ou trocando de aba no tablet): grava o que estava esperando
  useEffect(() => {
    const aoEsconder = () => document.visibilityState === 'hidden' && confirmarRef.current();
    document.addEventListener('visibilitychange', aoEsconder);
    return () => {
      document.removeEventListener('visibilitychange', aoEsconder);
      confirmarRef.current();
    };
  }, []);

  /* ---------------- Contatos (só registram, não enviam nada) ---------------- */

  const registrar = async (projeto: ProjetoJornada, tipo: TipoContato, texto: string | null = null) => {
    if (legado || updating.includes(projeto.id)) return false;
    setUpdating((u) => [...u, projeto.id]);
    try {
      const { mudancas, evento } = await registrarContato(projeto, tipo, new Date(), texto, toquesFollowup(projeto));
      setProjetos((prev) => prev.map((p) => (p.id === projeto.id ? { ...p, ...mudancas } : p)));
      setEventos((prev) => [...prev, evento]);
      setVersaoEventos((v) => v + 1);
      setMensagem(`Registrado: ${ROTULO_CONTATO[tipo]} de ${nomeDe(projeto)}. Nada foi enviado ao cliente.`);
      return true;
    } catch (err) {
      console.error('Erro ao registrar contato:', err);
      setErro(`Não foi possível registrar o contato de ${nomeDe(projeto)}. Tente de novo.`);
      return false;
    } finally {
      setUpdating((u) => u.filter((id) => id !== projeto.id));
    }
  };

  /* ---------------- Navegação ---------------- */

  const irPara = (etapa: Etapa) => {
    const faixaDaEtapa = definicaoEtapa(etapa)?.faixa;
    if (faixa !== 'tudo' && faixaDaEtapa !== faixa) setFaixa('tudo');
    window.setTimeout(() => {
      const el = document.getElementById(idElementoColuna(etapa));
      if (!el) return;
      el.scrollIntoView({ behavior: menosMovimento ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
      document.getElementById(`titulo-${idElementoColuna(etapa)}`)?.focus({ preventScroll: true });
      setDestacada(etapa);
      window.setTimeout(() => setDestacada((d) => (d === etapa ? null : d)), 1600);
    }, 0);
  };

  const criar = async (dados: { nome: string; telefone: string; observacao: string }) => {
    await criarLead(dados.nome, dados.telefone, dados.observacao);
    setNovoAberto(false);
    setFiltro('todos');
    setBusca('');
    await carregar(true);
    setMensagem(`Novo contato criado: ${dados.nome}, em Novo contato.`);
    irPara('novo_contato');
  };

  /* ---------------- Arrastar e soltar ---------------- */

  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // No toque, segurar um instante para pegar: deslizar continua rolando a tela
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: coordenadasTeclado }),
  );

  const etapaDe = (id: UniqueIdentifier) => porId.get(String(id))?.projeto.status;
  const anuncios: Announcements = {
    onDragStart: ({ active }) =>
      `${nomeDe(porId.get(String(active.id))?.projeto)} pego. Está em ${rotuloEtapa(etapaDe(active.id))}.`,
    onDragOver: ({ over }) => {
      const etapa = etapaDaColuna(over?.id);
      if (!etapa) return 'Fora das etapas.';
      return `Sobre ${rotuloEtapa(etapa)}${etapaAvisaCliente(etapa) ? ', que avisa o cliente pelo WhatsApp' : ''}.`;
    },
    onDragEnd: ({ active, over }) => {
      const nome = nomeDe(porId.get(String(active.id))?.projeto);
      const etapa = etapaDaColuna(over?.id);
      const origem = active.data.current?.etapa as Etapa | undefined;
      return etapa && etapa !== origem
        ? `${nome} solto em ${rotuloEtapa(etapa)}. Você tem 5 segundos para desfazer.`
        : `${nome} continua em ${rotuloEtapa(origem)}.`;
    },
    onDragCancel: ({ active }) =>
      `Movimento cancelado. ${nomeDe(porId.get(String(active.id))?.projeto)} continua em ${rotuloEtapa(
        active.data.current?.etapa as Etapa | undefined,
      )}.`,
  };

  const aoComecar = ({ active }: DragStartEvent) => setArrastandoId(String(active.id));
  const aoSoltar = ({ active, over }: DragEndEvent) => {
    setArrastandoId(null);
    const para = etapaDaColuna(over?.id);
    const projeto = porId.get(String(active.id))?.projeto;
    if (projeto && para && para !== projeto.status) mover(projeto, para);
  };

  const animacaoSoltar: DropAnimation | null = menosMovimento
    ? null
    : {
        duration: 220,
        easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
        sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
      };

  /* ---------------- Render ---------------- */

  if (loading) {
    return (
      <div role="status" aria-label="Carregando a jornada dos clientes" className="space-y-6">
        <div className="space-y-3">
          <div className="esqueleto h-3 w-40" />
          <div className="esqueleto h-10 w-80 max-w-full" />
        </div>
        <div className="esqueleto h-14 w-full" />
        <div className="esqueleto h-28 w-full" />
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="w-64 shrink-0 space-y-2 rounded-xl border border-primor-line p-2 sm:flex-1">
              <div className="esqueleto h-5 w-32" />
              <div className="esqueleto h-36 w-full" />
              <div className="esqueleto h-36 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const selecionadoModelo = selecionado ? porId.get(selecionado) ?? null : null;
  const arrastando = arrastandoId ? porId.get(arrastandoId) ?? null : null;
  const faixasVisiveis = FAIXAS.filter((f) => faixa === 'tudo' || f.id === faixa);
  const ocultas = new Set<Etapa>(ETAPAS.filter((e) => faixa !== 'tudo' && e.faixa !== faixa).map((e) => e.id));

  const chips: { id: FiltroRapido; rotulo: string; n?: number }[] = [
    { id: 'todos', rotulo: 'Todos', n: modelos.length },
    { id: 'responder', rotulo: 'Precisa responder', n: quantFiltro.responder },
    { id: 'atrasados', rotulo: 'Atrasados', n: quantFiltro.atrasados },
    { id: 'esfriando', rotulo: 'Esfriando', n: quantFiltro.esfriando },
  ];

  return (
    <div className="space-y-6">
      <style>{CSS_CARD}</style>
      {/* Cabeçalho */}
      <header className="entrada flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="etiqueta">Do primeiro contato à instalação</p>
          <h1 className="titulo-pagina mt-2">Jornada dos clientes</h1>
          <p className="mt-2 max-w-xl text-primor-muted">
            Quem espera resposta, quem está esfriando e em que etapa cada projeto está.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end xl:flex-row xl:items-center">
          <IndicadorAoVivo agora={agora} noExpediente={noExpediente} />
          <button
            type="button"
            onClick={() => setNovoAberto(true)}
            disabled={legado}
            className="btn btn-primary w-full sm:w-auto"
          >
            <UserPlus aria-hidden="true" className="h-5 w-5" />
            Novo contato
          </button>
        </div>
      </header>

      {legado && (
        <p className="alerta alerta-info">
          O banco ainda não recebeu a atualização da jornada. O board mostra as etapas e permite mover os cards, mas
          relógios de resposta, histórico e novo contato ficam disponíveis depois da migração.
        </p>
      )}
      {erroCarga && (
        <div role="alert" className="alerta alerta-erro items-center justify-between">
          <span>{erroCarga}</span>
          <button type="button" onClick={() => carregar()} className="btn btn-outline btn-sm shrink-0">
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Tentar de novo
          </button>
        </div>
      )}

      <div className="entrada space-y-4" style={{ ['--i' as string]: 1 }}>
        <FaixaAlerta
          alerta={alerta}
          temCards={modelos.length > 0}
          legado={legado}
          onAbrir={(id) => setSelecionado(id)}
        />
        <LinhaMetricas metricas={metricas} legado={legado} />
        <DicaBoard aberta={dica === 'aberta'} onAlternar={(a) => setDica(a ? 'aberta' : 'fechada')} />
      </div>

      <div className="entrada space-y-4" style={{ ['--i' as string]: 2 }}>
        <MiniMapa contagem={contagem} atrasados={atrasadosPorEtapa} ocultas={ocultas} onIr={irPara} />

        {/* Busca, filtros rápidos, faixa e densidade */}
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative xl:w-64">
            <Search aria-hidden="true" className="field-icon-slot" />
            <label htmlFor="busca-jornada" className="sr-only">
              Buscar cliente, ambiente ou telefone
            </label>
            <input
              id="busca-jornada"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente…"
              className="field field-icon"
            />
          </div>
          <div role="group" aria-label="Filtro rápido" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 sm:pb-0">
            {chips.map((c) => {
              const ativo = filtro === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setFiltro(ativo && c.id !== 'todos' ? 'todos' : c.id)}
                  className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                    ativo
                      ? 'border-primor-secondary bg-primor-secondary text-primor-on-secondary'
                      : 'border-primor-line bg-primor-surface text-primor-secondary hover:border-primor-line-strong'
                  }`}
                >
                  {c.rotulo}
                  {typeof c.n === 'number' && (
                    <span className={`font-mono text-xs tabular ${ativo ? 'opacity-80' : 'text-primor-muted'}`}>{c.n}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 xl:ml-auto">
            <div role="group" aria-label="Faixas da jornada" className="flex flex-1 overflow-hidden rounded-lg border border-primor-line bg-primor-surface sm:flex-none">
              {(
                [
                  ['tudo', 'Jornada inteira'],
                  ['venda', 'Venda'],
                  ['execucao', 'Execução'],
                ] as const
              ).map(([valor, rotulo], i) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={faixa === valor}
                  onClick={() => setFaixa(valor)}
                  className={`min-h-[44px] flex-1 whitespace-nowrap px-3.5 text-sm font-medium transition-colors sm:flex-none ${
                    i > 0 ? 'border-l border-primor-line' : ''
                  } ${
                    faixa === valor
                      ? 'bg-primor-realce text-primor-secondary shadow-[inset_0_-2px_0_rgb(var(--primor-primary))]'
                      : 'text-primor-muted hover:bg-primor-paper-deep hover:text-primor-secondary'
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-pressed={compacto}
              onClick={() => setDensidade(compacto ? 'confortavel' : 'compacto')}
              title={compacto ? 'Mostrar cards completos' : 'Mostrar cards compactos'}
              className={`btn-icon border ${
                compacto
                  ? 'border-primor-secondary bg-primor-realce text-primor-secondary'
                  : 'border-primor-line bg-primor-surface text-primor-muted hover:text-primor-secondary'
              }`}
            >
              <Rows3 aria-hidden="true" className="h-5 w-5" />
              <span className="sr-only">Cards compactos</span>
            </button>
          </div>
        </div>

        {filtrando && (
          <p aria-live="polite" className="flex flex-wrap items-center gap-2 text-sm text-primor-muted">
            <span className="font-mono tabular">{visiveis.length}</span>
            {visiveis.length === 1 ? 'card encontrado' : 'cards encontrados'}
            <button
              type="button"
              onClick={() => {
                setFiltro('todos');
                setBusca('');
              }}
              className="btn btn-quiet btn-sm text-primor-primary-ink"
            >
              <X aria-hidden="true" className="h-4 w-4" />
              Limpar filtros
            </button>
          </p>
        )}
      </div>

      {/* Board */}
      {modelos.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border-[1.5px] border-dashed border-primor-line-strong px-6 py-14 text-center">
          <div aria-hidden="true" className="regua w-40" />
          <p className="mt-5 font-display text-xl font-semibold text-primor-secondary">Nenhum cliente na jornada ainda</p>
          <p className="mt-1 max-w-sm text-primor-muted">
            Registre o primeiro contato aqui ou faça um briefing em Nova Visita.
          </p>
          {!legado && (
            <button type="button" onClick={() => setNovoAberto(true)} className="btn btn-primary mt-6">
              <UserPlus aria-hidden="true" className="h-5 w-5" />
              Novo contato
            </button>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensores}
          collisionDetection={deteccaoColisao}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          accessibility={{
            announcements: anuncios,
            screenReaderInstructions: {
              draggable:
                'Para mover o card, aperte espaço ou Enter. Use as setas para escolher a etapa: esquerda e direita andam na jornada, cima e baixo trocam entre Venda e Execução. Aperte espaço ou Enter para soltar, ou Esc para cancelar.',
            },
          }}
          onDragStart={aoComecar}
          onDragEnd={aoSoltar}
          onDragCancel={() => setArrastandoId(null)}
        >
          <div className="space-y-8">
            {faixasVisiveis.map((f) => {
              const etapas = ETAPAS.filter((e) => e.faixa === f.id);
              const total = etapas.reduce((s, e) => s + (colunas.get(e.id)?.length ?? 0), 0);
              return (
                <FaixaJornada key={f.id} id={f.id} rotulo={f.rotulo} descricao={f.descricao} total={total}>
                  {etapas.map((etapa) => {
                    const lista = colunas.get(etapa.id) ?? [];
                    const limitar = etapa.id === 'concluido' && !todosConcluidos && lista.length > LIMITE_CONCLUIDOS;
                    const mostrados = limitar ? lista.slice(0, LIMITE_CONCLUIDOS) : lista;
                    return (
                      <ColunaJornada
                        key={etapa.id}
                        etapa={etapa}
                        numero={ORDEM_ETAPAS.indexOf(etapa.id) + 1}
                        quantidade={lista.length}
                        atrasados={lista.filter(atrasado).length}
                        colapsada={lista.length === 0}
                        arrastando={Boolean(arrastandoId)}
                        destacada={destacada === etapa.id}
                        estreita={f.id === 'execucao'}
                        rodape={
                          limitar ? (
                            <div className="px-2 pb-2">
                              <button
                                type="button"
                                onClick={() => setTodosConcluidos(true)}
                                className="btn btn-quiet btn-sm w-full text-primor-primary-ink"
                              >
                                Mostrar todos ({lista.length})
                              </button>
                            </div>
                          ) : null
                        }
                      >
                        {mostrados.map((m) => (
                          <li key={m.projeto.id}>
                            <CardArrastavel
                              modelo={m}
                              agora={agora}
                              noExpediente={noExpediente}
                              compacto={compacto}
                              ocupado={updating.includes(m.projeto.id)}
                              pendente={pendente?.projetoId === m.projeto.id}
                              legado={legado}
                              onAbrir={() => setSelecionado(m.projeto.id)}
                              onAcao={(tipo) => registrar(m.projeto, tipo)}
                              onMover={(para) => mover(m.projeto, para)}
                            />
                          </li>
                        ))}
                      </ColunaJornada>
                    );
                  })}
                </FaixaJornada>
              );
            })}
          </div>

          <DragOverlay dropAnimation={animacaoSoltar}>
            {arrastando ? (
              <CardJornada
                modelo={arrastando}
                agora={agora}
                noExpediente={noExpediente}
                compacto={compacto}
                legado={legado}
                sobreposto
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <PainelDetalhes
        modelo={selecionadoModelo}
        agora={agora}
        noExpediente={noExpediente}
        ocupado={selecionado ? updating.includes(selecionado) : false}
        legado={legado}
        versaoEventos={versaoEventos}
        onFechar={() => setSelecionado(null)}
        onAcao={(tipo, texto) => (selecionadoModelo ? registrar(selecionadoModelo.projeto, tipo, texto ?? null) : Promise.resolve(false))}
        onMover={(para) => {
          if (!selecionadoModelo) return;
          const projeto = selecionadoModelo.projeto;
          setSelecionado(null);
          mover(projeto, para);
        }}
      />

      <NovoContato aberto={novoAberto} onFechar={() => setNovoAberto(false)} onCriar={criar} />

      <AvisosJornada
        pendente={pendente}
        erro={erro}
        mensagem={mensagem}
        onExpirar={confirmarPendente}
        onDesfazer={desfazer}
        onFecharErro={fecharErro}
      />
    </div>
  );
}
