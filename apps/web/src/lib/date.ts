/**
 * Formata datas do banco em dd/mm/aaaa.
 * Colunas DATE vêm como "2026-10-13": formatadas direto da string, porque
 * new Date("2026-10-13") é lido como UTC e no fuso do Brasil mostraria o dia
 * anterior. Timestamps ("2026-10-13T02:13:11Z") usam o fuso local.
 */
export function formatarData(valor: string): string {
  const soData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (soData) return `${soData[3]}/${soData[2]}/${soData[1]}`;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? valor : d.toLocaleDateString("pt-BR");
}
