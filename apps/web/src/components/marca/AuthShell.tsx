import type { ReactNode } from 'react';
import { Marca } from './Marca';
import { VeioMadeira } from './VeioMadeira';

const ETAPAS_ATENDIMENTO = [
  { cota: '0', titulo: 'Primeira visita', texto: 'Briefing com o cliente, no local.' },
  { cota: '600', titulo: 'Levantamento', texto: 'Medidas em mm, ferragens e fotos do ambiente.' },
  { cota: '1200', titulo: 'Produção', texto: 'Cada etapa acompanhada pela equipe.' },
  { cota: '1800', titulo: 'Instalação', texto: 'Entrega com o termo assinado.' },
];

/**
 * Moldura das telas públicas (login, cadastro, redefinição de senha).
 * À esquerda, um painel em "madeira" com o percurso do cliente marcado numa
 * trena; à direita, o formulário sobre o papel.
 */
export function AuthShell({
  etiqueta,
  titulo,
  descricao,
  children,
  rodape,
}: {
  etiqueta: string;
  titulo: string;
  descricao?: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Painel da marca */}
      <aside className="on-dark relative overflow-hidden bg-primor-madeira text-white dark:border-r dark:border-white/10">
        <VeioMadeira />
        {/* Mobile: faixa compacta só com a marca */}
        <div className="relative px-5 py-5 lg:hidden">
          <Marca tom="claro" />
        </div>

        {/* Desktop: marca, frase e trena com o percurso do cliente */}
        <div className="relative hidden h-full min-h-[100dvh] flex-col justify-between px-12 py-12 lg:flex xl:px-16">
          <Marca tom="claro" tamanho="lg" />

          <div className="max-w-md">
            <p className="font-display text-[2.6rem] font-medium leading-[1.08] tracking-[-0.02em] text-white" style={{ fontVariationSettings: "'opsz' 96" }}>
              Do primeiro atendimento à instalação, cada medida no lugar.
            </p>

            <ol className="ml-14 mt-12 border-l-2 border-primor-primary/70">
              {ETAPAS_ATENDIMENTO.map((etapa) => (
                <li key={etapa.titulo} className="relative pb-7 pl-7 last:pb-0">
                  {/* marcação da trena */}
                  <span aria-hidden="true" className="absolute -left-[2px] top-2 h-[2px] w-4 bg-primor-primary/70" />
                  <span aria-hidden="true" className="absolute -left-[60px] top-0 w-11 text-right font-mono text-[11px] text-white/70 tabular">
                    {etapa.cota}
                  </span>
                  <p className="font-semibold text-white">{etapa.titulo}</p>
                  <p className="mt-0.5 text-sm text-white/75">{etapa.texto}</p>
                </li>
              ))}
            </ol>
          </div>

          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/70">
            © {new Date().getFullYear()} Primor Móveis
          </p>
        </div>
      </aside>

      {/* Formulário */}
      <main className="flex items-start justify-center px-4 pb-12 pt-8 sm:px-6 lg:items-center lg:py-12">
        <div className="w-full max-w-[26rem]">
          <p className="etiqueta">{etiqueta}</p>
          <h1 className="titulo-pagina mt-2">{titulo}</h1>
          {descricao && <p className="mt-3 max-w-prose text-primor-muted">{descricao}</p>}
          <div aria-hidden="true" className="regua mt-6" />

          <div className="mt-6">{children}</div>

          {rodape && <div className="mt-8 border-t border-primor-line pt-6 text-sm text-primor-muted">{rodape}</div>}

          <p className="mt-10 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-primor-muted lg:hidden">
            © {new Date().getFullYear()} Primor Móveis
          </p>
        </div>
      </main>
    </div>
  );
}
