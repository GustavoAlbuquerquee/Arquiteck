import type { Database } from '@/lib/supabase/types';

export type Etapa = Database['public']['Enums']['project_status'];
export type Faixa = 'venda' | 'execucao';

export interface DefinicaoEtapa {
  /** Valor gravado em projects.status */
  id: Etapa;
  /** Nome mostrado no board e nas outras telas */
  rotulo: string;
  /** Nome curto para o mini-mapa e o celular */
  curto: string;
  faixa: Faixa;
  /**
   * Mover um card PARA esta etapa avisa o cliente pelo WhatsApp (webhook do
   * n8n). São as mesmas etapas que já avisavam na antiga tela de Produção.
   */
  avisaCliente: boolean;
  /** Etapa de venda em que um card parado conta como "esfriando" */
  podeEsfriar: boolean;
  /** Dica curta sob o título da coluna */
  descricao: string;
}

/**
 * A jornada inteira, do primeiro contato à instalação, NA ORDEM. Fonte única:
 * o board, o Dashboard e o Histórico leem os rótulos daqui. Para renomear
 * uma etapa, mude o rótulo; para mudar a ordem ou criar etapa, também é
 * preciso o valor no enum project_status (migração).
 *
 * Decisão: o valor antigo `orcamento` é a etapa "Orçamento enviado".
 */
export const ETAPAS: readonly DefinicaoEtapa[] = [
  {
    id: 'novo_contato',
    rotulo: 'Novo contato',
    curto: 'Novo',
    faixa: 'venda',
    avisaCliente: false,
    podeEsfriar: true,
    descricao: 'Chegou agora, ainda sem conversa',
  },
  {
    id: 'em_conversa',
    rotulo: 'Em conversa',
    curto: 'Conversa',
    faixa: 'venda',
    avisaCliente: false,
    podeEsfriar: true,
    descricao: 'Entendendo o que o cliente quer',
  },
  {
    id: 'visita',
    rotulo: 'Visita / Briefing',
    curto: 'Visita',
    faixa: 'venda',
    avisaCliente: false,
    podeEsfriar: true,
    descricao: 'Medição e levantamento no local',
  },
  {
    id: 'orcamento',
    rotulo: 'Orçamento enviado',
    curto: 'Orçamento',
    faixa: 'venda',
    avisaCliente: true,
    podeEsfriar: true,
    descricao: 'Cobrança em D+1, D+3 e D+7',
  },
  {
    id: 'fechado',
    rotulo: 'Fechado',
    curto: 'Fechado',
    // Contrato assinado: o card passa da venda para a execução
    faixa: 'execucao',
    avisaCliente: false,
    podeEsfriar: false,
    descricao: 'Contrato assinado, aguardando projeto',
  },
  {
    id: 'pre_producao',
    rotulo: 'Pré-produção',
    curto: 'Pré-prod.',
    faixa: 'execucao',
    avisaCliente: true,
    podeEsfriar: false,
    descricao: 'Projeto executivo e plano de corte',
  },
  {
    id: 'producao',
    rotulo: 'Produção',
    curto: 'Produção',
    faixa: 'execucao',
    avisaCliente: true,
    podeEsfriar: false,
    descricao: 'Na fábrica: corte, fita e montagem',
  },
  {
    id: 'instalacao',
    rotulo: 'Instalação',
    curto: 'Instalação',
    faixa: 'execucao',
    avisaCliente: true,
    podeEsfriar: false,
    descricao: 'Equipe na obra',
  },
  {
    id: 'concluido',
    rotulo: 'Concluído',
    curto: 'Concluído',
    faixa: 'execucao',
    avisaCliente: true,
    podeEsfriar: false,
    descricao: 'Entregue ao cliente',
  },
] as const;

export const FAIXAS: readonly { id: Faixa; rotulo: string; descricao: string }[] = [
  { id: 'venda', rotulo: 'Venda', descricao: 'Do primeiro contato ao orçamento' },
  { id: 'execucao', rotulo: 'Execução', descricao: 'Do contrato fechado à entrega' },
];

export const ORDEM_ETAPAS: readonly Etapa[] = ETAPAS.map((e) => e.id);

/** Rótulo por valor do banco, para telas que só precisam do nome */
export const ROTULO_ETAPA: Record<string, string> = Object.fromEntries(
  ETAPAS.map((e) => [e.id, e.rotulo]),
);

export function definicaoEtapa(id: string | null | undefined): DefinicaoEtapa | undefined {
  return ETAPAS.find((e) => e.id === id);
}

export function rotuloEtapa(id: string | null | undefined): string {
  return (id && ROTULO_ETAPA[id]) || id || '—';
}

export function indiceEtapa(id: string | null | undefined): number {
  return ORDEM_ETAPAS.indexOf((id ?? '') as Etapa);
}

export function etapaVizinha(id: Etapa, direcao: 'avancar' | 'voltar'): Etapa | null {
  const i = indiceEtapa(id);
  const j = direcao === 'avancar' ? i + 1 : i - 1;
  return i < 0 || j < 0 || j >= ORDEM_ETAPAS.length ? null : ORDEM_ETAPAS[j];
}

export function etapasDaFaixa(faixa: Faixa): DefinicaoEtapa[] {
  return ETAPAS.filter((e) => e.faixa === faixa);
}
