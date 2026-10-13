import { useId, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { OPCOES_TEMA, rotuloPreferencia, useTema, type PreferenciaTema } from '@/lib/tema';

const ICONE: Record<PreferenciaTema, typeof Sun> = {
  claro: Sun,
  escuro: Moon,
  sistema: Monitor,
};

const DESCRICAO: Record<PreferenciaTema, string> = {
  claro: 'Papel claro, bom sob luz do dia e na obra.',
  escuro: 'Madeira escura, para ambientes com pouca luz.',
  sistema: 'Acompanha a configuração do aparelho.',
};

/**
 * Seletor de tema com três opções (rádios nativos: o leitor de tela anuncia
 * "Claro, botão de opção, 1 de 3, selecionado").
 *
 * - "madeira": régua compacta para o menu lateral, sobre o painel escuro.
 * - "papel": cartões com descrição, para a seção Aparência em Configurações.
 */
export function SeletorTema({ variante }: { variante: 'madeira' | 'papel' }) {
  const { preferencia, aplicado, definirTema } = useTema();
  const nome = useId();

  if (variante === 'madeira') {
    return (
      <fieldset>
        <legend className="mb-2 px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-white/70">
          Tema
        </legend>
        <div className="grid grid-cols-3 gap-1 rounded-md border border-white/20 p-1">
          {OPCOES_TEMA.map(({ valor, rotulo }) => {
            const Icone = ICONE[valor];
            const marcado = preferencia === valor;
            return (
              <label
                key={valor}
                className={`flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[5px] text-[12px] font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primor-primary ${
                  marcado ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/5 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name={nome}
                  value={valor}
                  checked={marcado}
                  onChange={() => definirTema(valor)}
                  className="sr-only"
                />
                <Icone
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className={`h-4 w-4 ${marcado ? 'text-primor-primary' : ''}`}
                />
                {rotulo}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset>
      <legend className="sr-only">Tema</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {OPCOES_TEMA.map(({ valor, rotulo }) => {
          const Icone = ICONE[valor];
          const marcado = preferencia === valor;
          return (
            <label
              key={valor}
              className={`relative flex min-h-[44px] cursor-pointer items-start gap-3 rounded-md border-[1.5px] px-4 py-3.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primor-secondary dark:has-[:focus-visible]:outline-primor-primary ${
                marcado
                  ? 'border-primor-secondary bg-primor-realce'
                  : 'border-primor-line bg-primor-surface hover:border-primor-line-strong'
              }`}
            >
              <input
                type="radio"
                name={nome}
                value={valor}
                checked={marcado}
                onChange={() => definirTema(valor)}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-semibold text-primor-secondary">
                  <Icone aria-hidden="true" strokeWidth={1.75} className="h-4 w-4 text-primor-primary-ink" />
                  {rotulo}
                </span>
                <span className="mt-0.5 block text-sm text-primor-muted">
                  {DESCRICAO[valor]}
                  {valor === 'sistema' && (
                    <> Agora: {aplicado === 'escuro' ? 'escuro' : 'claro'}.</>
                  )}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const ORDEM: PreferenciaTema[] = ['claro', 'escuro', 'sistema'];

/**
 * Botão de ícone para a barra superior do celular: alterna Claro → Escuro →
 * Sistema. O rótulo diz o tema atual e o próximo; a mudança é anunciada.
 */
export function BotaoTema({ className = '' }: { className?: string }) {
  const { preferencia, aplicado, definirTema } = useTema();
  const [anuncio, setAnuncio] = useState('');
  const proximo = ORDEM[(ORDEM.indexOf(preferencia) + 1) % ORDEM.length];
  const Icone = ICONE[preferencia];
  const atual =
    preferencia === 'sistema'
      ? `Sistema (${aplicado === 'escuro' ? 'escuro' : 'claro'})`
      : rotuloPreferencia(preferencia);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          definirTema(proximo);
          setAnuncio(
            proximo === 'sistema'
              ? 'Tema do sistema ativado'
              : `Tema ${rotuloPreferencia(proximo).toLowerCase()} ativado`,
          );
        }}
        aria-label={`Tema: ${atual}. Mudar para ${rotuloPreferencia(proximo).toLowerCase()}`}
        title={`Tema: ${atual}`}
        className={`btn-icon ${className}`}
      >
        <Icone aria-hidden="true" strokeWidth={1.75} className="h-6 w-6" />
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {anuncio}
      </span>
    </>
  );
}
