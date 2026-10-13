/**
 * Textura de veio de madeira gerada por SVG (feTurbulence esticado na
 * horizontal), aplicada como imagem de fundo: o navegador rasteriza uma vez
 * e reaproveita, sem recalcular o filtro a cada repintura (importante em
 * tablet). Puramente decorativa e ignorada por leitores de tela.
 */
const SVG_VEIO = (semente: number) =>
  `<svg xmlns='http://www.w3.org/2000/svg' width='900' height='900'>` +
  `<filter id='v' x='0' y='0' width='100%' height='100%'>` +
  `<feTurbulence type='fractalNoise' baseFrequency='0.0035 0.085' numOctaves='3' seed='${semente}' stitchTiles='stitch'/>` +
  `<feColorMatrix type='matrix' values='0 0 0 0 0.94  0 0 0 0 0.63  0 0 0 0 0.18  2.6 0 0 0 -1.15'/>` +
  `</filter><rect width='100%' height='100%' filter='url(#v)'/></svg>`;

export function VeioMadeira({
  className = '',
  opacidade = 0.12,
  semente = 7,
}: {
  className?: string;
  opacidade?: number;
  semente?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        opacity: opacidade,
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(SVG_VEIO(semente))}")`,
        backgroundSize: '900px 900px',
        backgroundRepeat: 'repeat',
      }}
    />
  );
}
