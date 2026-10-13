/**
 * Leitura e gravação do board da jornada no Supabase. Tudo passa pela RLS
 * por tenant: o app nunca envia tenant_id (o banco usa auth_tenant_id()).
 */
import { supabase } from '@/lib/supabase';
import { calcularProximoFollowup, type DadosRelogio } from './relogios';
import { definicaoEtapa, rotuloEtapa, type Etapa } from './etapas';

export interface ProjetoJornada extends DadosRelogio {
  id: string;
  status: Etapa;
  titulo_ambiente: string | null;
  clients: { nome: string; telefone: string | null } | null;
}

export type TipoEvento =
  | 'criado'
  | 'etapa'
  | 'mensagem'
  | 'contato_cliente'
  | 'resposta'
  | 'followup'
  | 'retomada'
  | 'nota';

/** Contatos que a equipe registra pelo board. Nenhum deles manda nada ao cliente. */
export type TipoContato = 'resposta' | 'followup' | 'retomada' | 'contato_cliente' | 'mensagem' | 'nota';

export interface EventoJornada {
  id: string;
  project_id: string;
  tipo: string;
  de_etapa: Etapa | null;
  para_etapa: Etapa | null;
  mensagem: string | null;
  origem: string;
  created_at: string;
  profiles?: { nome_completo: string | null } | null;
}

const CAMPOS_BASE = 'id, titulo_ambiente, status, created_at, data_prevista_instalacao, clients(nome, telefone)';
const CAMPOS_JORNADA =
  'etapa_desde, ultimo_contato_cliente_at, ultimo_contato_nosso_at, proximo_followup_at';
const CAMPOS_EVENTO = 'id, project_id, tipo, de_etapa, para_etapa, mensagem, origem, created_at';

/** Dias de eventos carregados com o board (métricas, última mensagem, follow-ups) */
export const JANELA_EVENTOS_DIAS = 60;

export interface DadosBoard {
  projetos: ProjetoJornada[];
  eventos: EventoJornada[];
  /**
   * true quando o banco ainda não tem a migração 20261016120000: o board
   * mostra as etapas, mas sem relógios de contato, histórico e novo contato.
   */
  legado: boolean;
}

function faltaMigracao(erro: { code?: string; message?: string } | null) {
  if (!erro) return false;
  return (
    erro.code === '42703' || // coluna inexistente
    erro.code === '42P01' || // tabela inexistente
    erro.code === 'PGRST200' || // relação desconhecida no cache do PostgREST
    erro.code === 'PGRST204' ||
    erro.code === 'PGRST205'
  );
}

export async function carregarBoard(): Promise<DadosBoard> {
  const completo = await supabase
    .from('projects')
    .select(`${CAMPOS_BASE}, ${CAMPOS_JORNADA}`)
    .order('created_at', { ascending: false });

  if (completo.error && !faltaMigracao(completo.error)) throw completo.error;

  if (completo.error) {
    const antigo = await supabase
      .from('projects')
      .select(CAMPOS_BASE)
      .order('created_at', { ascending: false });
    if (antigo.error) throw antigo.error;
    const linhas = (antigo.data ?? []) as unknown as Omit<
      ProjetoJornada,
      'etapa_desde' | 'ultimo_contato_cliente_at' | 'ultimo_contato_nosso_at' | 'proximo_followup_at'
    >[];
    const projetos: ProjetoJornada[] = linhas.map((p) => ({
      ...p,
      status: p.status ?? 'orcamento',
      etapa_desde: p.created_at,
      ultimo_contato_cliente_at: null,
      ultimo_contato_nosso_at: null,
      proximo_followup_at: null,
    }));
    return { projetos, eventos: [], legado: true };
  }

  const desde = new Date(Date.now() - JANELA_EVENTOS_DIAS * 86_400_000).toISOString();
  const eventos = await supabase
    .from('project_eventos')
    .select(CAMPOS_EVENTO)
    .gte('created_at', desde)
    .order('created_at', { ascending: false })
    .limit(5000);
  if (eventos.error && !faltaMigracao(eventos.error)) throw eventos.error;

  const projetos = ((completo.data ?? []) as unknown as ProjetoJornada[]).map((p) => ({
    ...p,
    status: (p.status ?? 'orcamento') as Etapa,
  }));
  return {
    projetos,
    eventos: ((eventos.data ?? []) as EventoJornada[]).slice().reverse(),
    legado: Boolean(eventos.error),
  };
}

export async function carregarHistorico(projectId: string): Promise<EventoJornada[]> {
  const { data, error } = await supabase
    .from('project_eventos')
    .select(`${CAMPOS_EVENTO}, profiles(nome_completo)`)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as EventoJornada[];
}

/**
 * Grava a nova etapa. Entrar em "Orçamento enviado" conta como contato nosso
 * (o orçamento foi enviado agora) e agenda o follow-up D+1; sair dela limpa o
 * follow-up. O trigger do banco atualiza etapa_desde e registra o evento.
 */
export async function gravarEtapa(
  projeto: ProjetoJornada,
  de: Etapa,
  para: Etapa,
  agora: Date,
  legado: boolean,
): Promise<Partial<ProjetoJornada>> {
  const mudancas: Record<string, string | null> = { status: para };
  if (!legado) {
    if (para === 'orcamento') {
      mudancas.ultimo_contato_nosso_at = agora.toISOString();
      mudancas.proximo_followup_at = calcularProximoFollowup(agora, 0)!.toISOString();
    } else if (de === 'orcamento') {
      mudancas.proximo_followup_at = null;
    }
  }
  const consulta = supabase.from('projects').update(mudancas).eq('id', projeto.id);
  if (legado) {
    const { error } = await consulta;
    if (error) throw error;
    return { status: para };
  }
  const { data, error } = await consulta.select(CAMPOS_JORNADA).single();
  if (error) throw error;
  return { ...(mudancas as Partial<ProjetoJornada>), ...(data as Partial<ProjetoJornada>) };
}

/**
 * Registra um contato no histórico e atualiza o relógio correspondente.
 * Só grava no banco: não envia mensagem nenhuma ao cliente.
 * @param toquesFollowup cobranças já feitas na etapa (para agendar a próxima)
 */
export async function registrarContato(
  projeto: ProjetoJornada,
  tipo: TipoContato,
  agora: Date,
  mensagem: string | null = null,
  toquesFollowup = 0,
): Promise<{ mudancas: Partial<ProjetoJornada>; evento: EventoJornada }> {
  const quando = agora.toISOString();
  const mudancas: Partial<
    Pick<ProjetoJornada, 'ultimo_contato_cliente_at' | 'ultimo_contato_nosso_at' | 'proximo_followup_at'>
  > = {};
  if (tipo === 'resposta' || tipo === 'followup' || tipo === 'retomada') {
    mudancas.ultimo_contato_nosso_at = quando;
  } else if (tipo === 'contato_cliente' || tipo === 'mensagem') {
    mudancas.ultimo_contato_cliente_at = quando;
  }
  if (tipo === 'followup') {
    mudancas.proximo_followup_at =
      calcularProximoFollowup(agora, toquesFollowup + 1)?.toISOString() ?? null;
  }

  const { data: evento, error: erroEvento } = await supabase
    .from('project_eventos')
    .insert({ project_id: projeto.id, tipo, mensagem, origem: 'manual' })
    .select(CAMPOS_EVENTO)
    .single();
  if (erroEvento) throw erroEvento;

  if (Object.keys(mudancas).length) {
    const { error } = await supabase.from('projects').update(mudancas).eq('id', projeto.id);
    if (error) throw error;
  }
  return { mudancas, evento: evento as EventoJornada };
}

export async function criarLead(nome: string, telefone: string, observacao: string): Promise<string> {
  const { data, error } = await supabase.rpc('criar_lead', {
    p_nome: nome,
    p_telefone: telefone || null,
    p_observacao: observacao || null,
  });
  if (error) throw error;
  return data as string;
}

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined;

/** Etapas em que mover o card avisa o cliente pelo WhatsApp */
export function etapaAvisaCliente(etapa: Etapa) {
  return Boolean(definicaoEtapa(etapa)?.avisaCliente);
}

export function podeAvisarCliente(projeto: ProjetoJornada) {
  return Boolean(projeto.clients?.telefone && N8N_WEBHOOK_URL);
}

/**
 * Avisa o cliente pelo WhatsApp via n8n, com o mesmo payload da antiga tela
 * de Produção. Falha no aviso não desfaz a mudança de etapa.
 */
export async function notificarMudancaDeEtapa(projeto: ProjetoJornada, de: Etapa, para: Etapa) {
  const telefone = projeto.clients?.telefone;
  if (!telefone || !N8N_WEBHOOK_URL || !etapaAvisaCliente(para)) return;
  try {
    await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telefone,
        cliente_nome: projeto.clients?.nome ?? '',
        ambiente: projeto.titulo_ambiente ?? '',
        status_anterior: rotuloEtapa(de),
        status_novo: rotuloEtapa(para),
        projeto_id: projeto.id,
      }),
    });
  } catch (err) {
    console.warn('Aviso: falha ao notificar n8n:', err);
  }
}
