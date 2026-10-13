/**
 * Métricas e alertas do topo do board, calculados dos dados reais. Funções
 * puras, testadas em metricas.test.ts. Sem dado suficiente, devolvem null e a
 * tela mostra "—".
 */
import {
  EXPEDIENTE,
  META_RESPOSTA_MIN,
  minutosUteisEntre,
  type ConfigExpediente,
  type Situacao,
} from './relogios';

/** Eventos em que o cliente falou com a loja */
export const TIPOS_DO_CLIENTE = ['mensagem', 'contato_cliente'] as const;
/** Eventos em que a loja falou com o cliente */
export const TIPOS_NOSSOS = ['resposta', 'followup', 'retomada'] as const;

export interface EventoMetrica {
  project_id: string;
  tipo: string;
  created_at: string;
}

/**
 * Pares "cliente falou → nós respondemos", em minutos úteis. Várias mensagens
 * seguidas do cliente contam a partir da primeira sem resposta.
 * @param desde só conta respostas dadas a partir deste instante
 */
export function temposDeResposta(
  eventos: readonly EventoMetrica[],
  desde: Date | null = null,
  cfg: ConfigExpediente = EXPEDIENTE,
): number[] {
  const porProjeto = new Map<string, EventoMetrica[]>();
  for (const e of eventos) {
    const lista = porProjeto.get(e.project_id);
    if (lista) lista.push(e);
    else porProjeto.set(e.project_id, [e]);
  }
  const tempos: number[] = [];
  for (const lista of porProjeto.values()) {
    lista.sort((a, b) => a.created_at.localeCompare(b.created_at));
    let aguardando: Date | null = null;
    for (const e of lista) {
      const quando = new Date(e.created_at);
      if ((TIPOS_DO_CLIENTE as readonly string[]).includes(e.tipo)) {
        aguardando ??= quando;
      } else if ((TIPOS_NOSSOS as readonly string[]).includes(e.tipo) && aguardando) {
        if (!desde || quando >= desde) tempos.push(minutosUteisEntre(aguardando, quando, cfg));
        aguardando = null;
      }
    }
  }
  return tempos;
}

export interface CardParaMetrica {
  id: string;
  nome: string;
  situacao: Situacao;
  esfriando: number | null;
}

export interface Metricas {
  /** Média em minutos úteis; null sem respostas na janela */
  tempoMedioResposta: number | null;
  /** 0 a 100; null sem respostas na janela */
  percentualNoPrazo: number | null;
  respostasNaJanela: number;
  esperandoAgora: number;
  tarefasAbertas: number;
}

export function calcularMetricas(
  eventos: readonly EventoMetrica[],
  cards: readonly CardParaMetrica[],
  agora: Date,
  janelaDias = 30,
  cfg: ConfigExpediente = EXPEDIENTE,
): Metricas {
  const desde = new Date(agora.getTime() - janelaDias * 86_400_000);
  const tempos = temposDeResposta(eventos, desde, cfg);
  const n = tempos.length;
  return {
    tempoMedioResposta: n ? Math.round(tempos.reduce((s, t) => s + t, 0) / n) : null,
    percentualNoPrazo: n
      ? Math.round((tempos.filter((t) => t <= META_RESPOSTA_MIN).length / n) * 100)
      : null,
    respostasNaJanela: n,
    esperandoAgora: cards.filter((c) => c.situacao.tipo === 'responder').length,
    tarefasAbertas: cards.filter(temTarefaAberta).length,
  };
}

/** Card que pede uma ação agora: responder, cobrar (vencido) ou retomar */
export function temTarefaAberta(c: CardParaMetrica): boolean {
  const s = c.situacao;
  return (
    s.tipo === 'responder' ||
    (s.tipo === 'followup' && s.minutos <= 0) ||
    (c.esfriando !== null && s.tipo !== 'etapa' && s.tipo !== 'concluido')
  );
}

export interface Alerta {
  tipo: 'resposta' | 'followup';
  quantidade: number;
  /** O caso mais grave, para resolver primeiro */
  pior: CardParaMetrica;
  /** Minutos de atraso do pior caso (úteis na resposta, corridos no follow-up) */
  minutos: number;
}

/**
 * Faixa de alerta: primeiro clientes esperando além da meta de resposta;
 * se não houver, follow-ups de orçamento vencidos. Null quando está tudo em dia.
 */
export function alertaPrincipal(cards: readonly CardParaMetrica[]): Alerta | null {
  const resposta = cards
    .filter((c) => c.situacao.tipo === 'responder' && c.situacao.atrasado)
    .sort((a, b) => minutosDeEspera(b) - minutosDeEspera(a));
  if (resposta.length) {
    return {
      tipo: 'resposta',
      quantidade: resposta.length,
      pior: resposta[0],
      minutos: minutosDeEspera(resposta[0]),
    };
  }
  const followups = cards
    .filter((c) => c.situacao.tipo === 'followup' && c.situacao.atrasado)
    .sort((a, b) => atrasoFollowup(b) - atrasoFollowup(a));
  if (followups.length) {
    return {
      tipo: 'followup',
      quantidade: followups.length,
      pior: followups[0],
      minutos: atrasoFollowup(followups[0]),
    };
  }
  return null;
}

function minutosDeEspera(c: CardParaMetrica) {
  return c.situacao.tipo === 'responder' ? c.situacao.minutosUteis : 0;
}

function atrasoFollowup(c: CardParaMetrica) {
  return c.situacao.tipo === 'followup' ? -c.situacao.minutos : 0;
}
