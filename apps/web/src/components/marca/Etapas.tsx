/**
 * Representação visual das etapas do projeto, da visita à instalação.
 * Só apresentação: os nomes das etapas continuam vindo de cada tela.
 */
export const ORDEM_ETAPAS = ['orcamento', 'pre_producao', 'producao', 'instalacao', 'concluido'] as const;

export function indiceEtapa(status: string | null | undefined) {
  return ORDEM_ETAPAS.indexOf((status ?? '') as (typeof ORDEM_ETAPAS)[number]);
}

/** Classes do selo de etapa: tons da própria paleta, do mais claro ao mais firme */
export function classeSeloEtapa(status: string | null | undefined) {
  switch (status) {
    case 'orcamento':
      return 'bg-white text-primor-secondary border-primor-line-strong';
    case 'pre_producao':
      return 'bg-[#fdf4e6] text-primor-secondary border-primor-primary';
    case 'producao':
      return 'bg-primor-primary text-primor-secondary border-primor-primary';
    case 'instalacao':
      return 'bg-primor-secondary text-white border-primor-secondary';
    case 'concluido':
      return 'bg-[#eef7f1] text-[#05603a] border-[#067647]';
    default:
      return 'bg-primor-paper-deep text-primor-muted border-primor-line';
  }
}

/**
 * Medidor de etapas em forma de régua: cinco marcações, preenchidas até a etapa
 * atual. O texto da etapa vem junto (a cor nunca é a única informação).
 */
export function MedidorEtapa({
  status,
  rotulo,
  compacto = false,
}: {
  status: string | null | undefined;
  rotulo: string;
  compacto?: boolean;
}) {
  const atual = indiceEtapa(status);

  return (
    <span className="inline-flex items-center gap-2" title={rotulo}>
      <span aria-hidden="true" className="flex items-end gap-[3px]">
        {ORDEM_ETAPAS.map((etapa, i) => (
          <span
            key={etapa}
            className={`w-[3px] rounded-[1px] ${i <= atual ? (atual === ORDEM_ETAPAS.length - 1 ? 'bg-[#067647]' : 'bg-primor-primary-ink') : 'bg-primor-line'} ${
              i === 0 || i === ORDEM_ETAPAS.length - 1 ? 'h-3.5' : 'h-2.5'
            }`}
          />
        ))}
      </span>
      <span
        className={`font-medium text-primor-secondary ${compacto ? 'text-xs' : 'text-sm'}`}
      >
        {rotulo}
      </span>
    </span>
  );
}
