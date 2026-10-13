/**
 * Marca do Arquiteck: um encaixe rabo-de-andorinha (a junta clássica da
 * marcenaria) ao lado do nome. O símbolo é decorativo; o nome é o texto real.
 */
export function SimboloEncaixe({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className}>
      {/* peça de cima, com o rabo-de-andorinha (mais largo na ponta) */}
      <path d="M3 3H29V11H19L22 18H10L13 11H3Z" fill="currentColor" />
      {/* peça de baixo, com o encaixe fêmea */}
      <path d="M3 12.5H10.9L8.5 19.5H23.5L21.1 12.5H29V29H3Z" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

export function Marca({
  tom = 'claro',
  subtitulo = 'Primor Móveis',
  tamanho = 'md',
}: {
  /** "claro" para fundo escuro (texto claro), "escuro" para fundo claro */
  tom?: 'claro' | 'escuro';
  subtitulo?: string | null;
  tamanho?: 'md' | 'lg';
}) {
  const corNome = tom === 'claro' ? 'text-white' : 'text-primor-secondary';
  const corSimbolo = tom === 'claro' ? 'text-primor-primary' : 'text-primor-secondary';
  const corSub = tom === 'claro' ? 'text-primor-primary' : 'text-primor-primary-ink';

  return (
    <div className="flex items-center gap-3">
      <SimboloEncaixe className={`${tamanho === 'lg' ? 'h-10 w-10' : 'h-8 w-8'} ${corSimbolo}`} />
      <div className="leading-none">
        <p
          className={`font-display font-semibold tracking-[-0.02em] ${corNome} ${
            tamanho === 'lg' ? 'text-[1.75rem]' : 'text-[1.4rem]'
          }`}
          style={{ fontVariationSettings: "'opsz' 48" }}
        >
          Arquiteck
        </p>
        {subtitulo && (
          <p className={`mt-1 font-mono text-[11px] font-medium uppercase tracking-[0.16em] ${corSub}`}>
            {subtitulo}
          </p>
        )}
      </div>
    </div>
  );
}
