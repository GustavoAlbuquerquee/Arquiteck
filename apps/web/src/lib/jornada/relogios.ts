/**
 * Relógios e prazos da jornada do cliente. Só funções puras: recebem o
 * "agora" como parâmetro e não leem relógio, rede nem DOM, para poderem ser
 * testadas com datas fixas (relogios.test.ts).
 *
 * Regras:
 * - Tempo de espera conta só em horário útil: 08:00 às 18:00, segunda a
 *   sexta, no fuso America/Sao_Paulo. Fora disso o relógio fica pausado.
 *   Feriados ainda não são considerados.
 * - Meta de resposta: 15 minutos úteis.
 * - Follow-up do orçamento: D+1, D+3 e D+7 (dias corridos) a partir do
 *   último contato nosso na etapa "Orçamento enviado".
 * - Esfriando: card de venda sem nenhum movimento há 3 dias ou mais.
 */
import { definicaoEtapa, type Etapa } from './etapas';

export interface ConfigExpediente {
  fuso: string;
  /** Minutos desde a meia-noite */
  inicioMin: number;
  fimMin: number;
  /** 0 = domingo ... 6 = sábado */
  diasUteis: readonly number[];
}

export const EXPEDIENTE: ConfigExpediente = {
  fuso: 'America/Sao_Paulo',
  inicioMin: 8 * 60,
  fimMin: 18 * 60,
  diasUteis: [1, 2, 3, 4, 5],
};

export const META_RESPOSTA_MIN = 15;
export const CADENCIA_FOLLOWUP_DIAS = [1, 3, 7] as const;
export const DIAS_ESFRIANDO = 3;

const MIN = 60_000;
const DIA = 86_400_000;

/* ------------------------------------------------------------------
   Datas no fuso da loja
   ------------------------------------------------------------------ */

const formatadores = new Map<string, Intl.DateTimeFormat>();
function formatador(fuso: string) {
  let f = formatadores.get(fuso);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: fuso,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatadores.set(fuso, f);
  }
  return f;
}

export interface PartesData {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
  /** 0 = domingo */
  diaSemana: number;
}

/** Data e hora de parede no fuso informado */
export function partesNoFuso(d: Date, fuso = EXPEDIENTE.fuso): PartesData {
  const p: Record<string, number> = {};
  for (const { type, value } of formatador(fuso).formatToParts(d)) {
    if (type !== 'literal') p[type] = Number(value);
  }
  const hora = p.hour % 24;
  return {
    ano: p.year,
    mes: p.month,
    dia: p.day,
    hora,
    minuto: p.minute,
    segundo: p.second,
    diaSemana: new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(),
  };
}

function deslocamentoMs(instante: number, fuso: string) {
  const p = partesNoFuso(new Date(instante), fuso);
  const comoUtc = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  return comoUtc - Math.floor(instante / 1000) * 1000;
}

/** Instante (UTC) de uma hora de parede no fuso: dia D às HH:MM em São Paulo */
export function instanteNoFuso(
  ano: number,
  mes: number,
  dia: number,
  minutosDoDia: number,
  fuso = EXPEDIENTE.fuso,
): Date {
  const parede = Date.UTC(ano, mes - 1, dia, 0, minutosDoDia);
  // Duas passadas resolvem a troca de horário de verão, se ela voltar a existir
  let t = parede - deslocamentoMs(parede, fuso);
  t = parede - deslocamentoMs(t, fuso);
  return new Date(t);
}

/* ------------------------------------------------------------------
   Expediente
   ------------------------------------------------------------------ */

export function estaNoExpediente(agora: Date, cfg: ConfigExpediente = EXPEDIENTE): boolean {
  const p = partesNoFuso(agora, cfg.fuso);
  const minutos = p.hora * 60 + p.minuto;
  return cfg.diasUteis.includes(p.diaSemana) && minutos >= cfg.inicioMin && minutos < cfg.fimMin;
}

/** Próximo instante em que o expediente abre (ou `agora`, se já está aberto) */
export function proximaAbertura(agora: Date, cfg: ConfigExpediente = EXPEDIENTE): Date {
  if (estaNoExpediente(agora, cfg)) return agora;
  const p = partesNoFuso(agora, cfg.fuso);
  let dia = Date.UTC(p.ano, p.mes - 1, p.dia);
  for (let i = 0; i < 14; i++, dia += DIA) {
    const d = new Date(dia);
    if (!cfg.diasUteis.includes(d.getUTCDay())) continue;
    const abre = instanteNoFuso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), cfg.inicioMin, cfg.fuso);
    if (abre > agora) return abre;
  }
  return agora;
}

/**
 * Minutos de expediente entre dois instantes. Pausa à noite, no fim de semana
 * e fora do horário. Intervalos de mais de ~2 anos param de contar no limite.
 */
export function minutosUteisEntre(
  inicio: Date,
  fim: Date,
  cfg: ConfigExpediente = EXPEDIENTE,
): number {
  if (!(fim > inicio)) return 0;
  const pi = partesNoFuso(inicio, cfg.fuso);
  const pf = partesNoFuso(fim, cfg.fuso);
  const ultimo = Date.UTC(pf.ano, pf.mes - 1, pf.dia);
  let dia = Date.UTC(pi.ano, pi.mes - 1, pi.dia);
  let total = 0;
  for (let guarda = 0; dia <= ultimo && guarda < 800; guarda++, dia += DIA) {
    const d = new Date(dia);
    if (!cfg.diasUteis.includes(d.getUTCDay())) continue;
    const [a, m, dd] = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
    const abre = instanteNoFuso(a, m, dd, cfg.inicioMin, cfg.fuso).getTime();
    const fecha = instanteNoFuso(a, m, dd, cfg.fimMin, cfg.fuso).getTime();
    const de = Math.max(abre, inicio.getTime());
    const ate = Math.min(fecha, fim.getTime());
    if (ate > de) total += ate - de;
  }
  return Math.floor(total / MIN);
}

/* ------------------------------------------------------------------
   Formatação
   ------------------------------------------------------------------ */

/** 12 min · 1h 05min · 36h · 3d 4h */
export function formatarDuracao(minutos: number): string {
  const m = Math.max(0, Math.floor(Math.abs(minutos)));
  if (m < 1) return 'menos de 1 min';
  if (m < 60) return `${m} min`;
  if (m < 48 * 60) {
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}h ${String(r).padStart(2, '0')}min` : `${h}h`;
  }
  const d = Math.floor(m / (24 * 60));
  const h = Math.floor((m % (24 * 60)) / 60);
  return h ? `${d}d ${h}h` : `${d}d`;
}

const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** "hoje às 08:00", "amanhã às 08:00", "segunda às 08:00" */
export function descreverQuando(alvo: Date, agora: Date, fuso = EXPEDIENTE.fuso): string {
  const a = partesNoFuso(alvo, fuso);
  const h = partesNoFuso(agora, fuso);
  const hora = `${String(a.hora).padStart(2, '0')}:${String(a.minuto).padStart(2, '0')}`;
  const dias = Math.round(
    (Date.UTC(a.ano, a.mes - 1, a.dia) - Date.UTC(h.ano, h.mes - 1, h.dia)) / DIA,
  );
  if (dias === 0) return `hoje às ${hora}`;
  if (dias === 1) return `amanhã às ${hora}`;
  if (dias > 1 && dias < 7) return `${DIAS_SEMANA[a.diaSemana]} às ${hora}`;
  return `${String(a.dia).padStart(2, '0')}/${String(a.mes).padStart(2, '0')} às ${hora}`;
}

/* ------------------------------------------------------------------
   Situação de cada card
   ------------------------------------------------------------------ */

export interface DadosRelogio {
  status: Etapa | null;
  created_at: string | null;
  etapa_desde: string | null;
  ultimo_contato_cliente_at: string | null;
  ultimo_contato_nosso_at: string | null;
  proximo_followup_at: string | null;
  data_prevista_instalacao: string | null;
}

export type Situacao =
  /** O cliente falou por último: estamos devendo resposta */
  | {
      tipo: 'responder';
      desde: Date;
      minutosUteis: number;
      atrasado: boolean;
    }
  /** Orçamento enviado: próximo toque da cadência */
  | {
      tipo: 'followup';
      marco: string;
      vence: Date;
      /** Minutos até vencer; negativo = atrasado */
      minutos: number;
      atrasado: boolean;
    }
  /** Respondemos por último: a bola está com o cliente */
  | { tipo: 'esperando'; desde: Date; proximoToque: Date | null }
  /** Fechado e execução: tempo na etapa e prazo da instalação */
  | { tipo: 'etapa'; desde: Date; dias: number; diasParaInstalacao: number | null }
  | { tipo: 'concluido'; desde: Date };

export function lerData(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Quando o card entrou na etapa atual (projetos antigos: criação) */
export function inicioDaEtapa(d: DadosRelogio, agora: Date): Date {
  return lerData(d.etapa_desde) ?? lerData(d.created_at) ?? agora;
}

/**
 * Próximo follow-up a partir do último contato nosso. Os intervalos são as
 * diferenças da cadência (1, 2 e 4 dias), então quem cobra no dia certo cai
 * exatamente em D+1, D+3 e D+7 do envio do orçamento. Depois do D+7, null.
 */
export function calcularProximoFollowup(base: Date, toquesFeitos: number): Date | null {
  if (toquesFeitos < 0 || toquesFeitos >= CADENCIA_FOLLOWUP_DIAS.length) return null;
  const anterior = toquesFeitos === 0 ? 0 : CADENCIA_FOLLOWUP_DIAS[toquesFeitos - 1];
  return new Date(base.getTime() + (CADENCIA_FOLLOWUP_DIAS[toquesFeitos] - anterior) * DIA);
}

export function rotuloMarcoFollowup(toquesFeitos: number): string {
  const i = Math.min(Math.max(toquesFeitos, 0), CADENCIA_FOLLOWUP_DIAS.length - 1);
  return `D+${CADENCIA_FOLLOWUP_DIAS[i]}`;
}

/** Dias corridos entre a data de hoje (no fuso) e uma coluna DATE "2026-10-20" */
export function diasAteData(data: string, agora: Date, fuso = EXPEDIENTE.fuso): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data);
  if (!m) return null;
  const h = partesNoFuso(agora, fuso);
  return Math.round(
    (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(h.ano, h.mes - 1, h.dia)) / DIA,
  );
}

/**
 * Em que pé está o card agora.
 * @param toquesFollowup cobranças registradas desde que entrou na etapa
 */
export function situacaoDoCard(
  d: DadosRelogio,
  agora: Date,
  toquesFollowup = 0,
  cfg: ConfigExpediente = EXPEDIENTE,
): Situacao {
  const status: Etapa = d.status ?? 'orcamento';
  const desdeEtapa = inicioDaEtapa(d, agora);
  if (status === 'concluido') return { tipo: 'concluido', desde: desdeEtapa };

  const cliente = lerData(d.ultimo_contato_cliente_at);
  const nosso = lerData(d.ultimo_contato_nosso_at);

  let aguardando: Date | null = null;
  if (cliente && (!nosso || cliente > nosso)) aguardando = cliente;
  else if (status === 'novo_contato' && !cliente && !nosso) aguardando = desdeEtapa;

  if (aguardando) {
    const minutosUteis = minutosUteisEntre(aguardando, agora, cfg);
    return {
      tipo: 'responder',
      desde: aguardando,
      minutosUteis,
      atrasado: minutosUteis > META_RESPOSTA_MIN,
    };
  }

  if (status === 'orcamento') {
    const vence =
      lerData(d.proximo_followup_at) ?? calcularProximoFollowup(nosso ?? desdeEtapa, toquesFollowup);
    if (vence) {
      const minutos = Math.floor((vence.getTime() - agora.getTime()) / MIN);
      return {
        tipo: 'followup',
        marco: rotuloMarcoFollowup(toquesFollowup),
        vence,
        minutos,
        atrasado: minutos < 0,
      };
    }
    return { tipo: 'esperando', desde: nosso ?? desdeEtapa, proximoToque: null };
  }

  if (definicaoEtapa(status)?.faixa === 'venda' && status !== 'fechado') {
    return {
      tipo: 'esperando',
      desde: nosso ?? desdeEtapa,
      proximoToque: lerData(d.proximo_followup_at),
    };
  }

  return {
    tipo: 'etapa',
    desde: desdeEtapa,
    dias: Math.max(0, Math.floor((agora.getTime() - desdeEtapa.getTime()) / DIA)),
    diasParaInstalacao: d.data_prevista_instalacao
      ? diasAteData(d.data_prevista_instalacao, agora, cfg.fuso)
      : null,
  };
}

/** Último movimento do card: troca de etapa ou contato de qualquer lado */
export function ultimoMovimento(d: DadosRelogio, agora: Date): Date {
  const datas = [d.etapa_desde, d.created_at, d.ultimo_contato_cliente_at, d.ultimo_contato_nosso_at]
    .map(lerData)
    .filter((x): x is Date => x !== null);
  return datas.length ? new Date(Math.max(...datas.map((x) => x.getTime()))) : agora;
}

/** Dias parado, se o card de venda está esfriando; senão null */
export function diasEsfriando(d: DadosRelogio, agora: Date): number | null {
  if (!definicaoEtapa(d.status ?? 'orcamento')?.podeEsfriar) return null;
  const dias = (agora.getTime() - ultimoMovimento(d, agora).getTime()) / DIA;
  return dias >= DIAS_ESFRIANDO ? Math.floor(dias) : null;
}

/**
 * Peso para ordenar os cards de uma coluna: o mais urgente primeiro.
 * Resposta atrasada > follow-up atrasado > resposta no prazo > follow-up do
 * dia > esfriando > o resto.
 */
export function pesoUrgencia(s: Situacao, esfriando: number | null, agora: Date): number {
  switch (s.tipo) {
    case 'responder':
      return (s.atrasado ? 9e6 : 7e6) + s.minutosUteis;
    case 'followup':
      if (s.atrasado) return 8e6 - s.minutos;
      if (s.minutos <= 24 * 60) return 6e6 - s.minutos;
      return (esfriando !== null ? 5e6 + esfriando : 3e6) - s.minutos / 100;
    case 'esperando':
      return (esfriando !== null ? 5e6 + esfriando : 2e6) + (agora.getTime() - s.desde.getTime()) / MIN / 1e3;
    case 'etapa':
      return s.diasParaInstalacao !== null ? 4e6 - s.diasParaInstalacao : 1e6 + s.dias;
    case 'concluido':
      return -(agora.getTime() - s.desde.getTime()) / MIN;
  }
}
