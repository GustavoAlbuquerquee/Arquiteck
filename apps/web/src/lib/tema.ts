import { useSyncExternalStore } from 'react';

/**
 * Preferência de tema: claro, escuro ou seguir o sistema (padrão).
 *
 * A primeira aplicação acontece no script inline do index.html, antes da
 * primeira pintura. Este módulo mantém a mesma regra depois que o React
 * carrega: troca a classe .dark no <html>, a meta theme-color e acompanha
 * mudanças do sistema quando a preferência é "sistema".
 */
export type PreferenciaTema = 'claro' | 'escuro' | 'sistema';
export type TemaAplicado = 'claro' | 'escuro';

const CHAVE = 'arquiteck-tema';
/** Cor da barra do navegador/PWA: a mesma da barra superior em cada tema */
const COR_BARRA: Record<TemaAplicado, string> = { claro: '#603829', escuro: '#2F1C13' };

export const OPCOES_TEMA: { valor: PreferenciaTema; rotulo: string }[] = [
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
  { valor: 'sistema', rotulo: 'Sistema' },
];

function lerPreferencia(): PreferenciaTema {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === 'claro' || salvo === 'escuro' || salvo === 'sistema') return salvo;
  } catch {
    // Sem storage (modo privado, bloqueio): fica no padrão
  }
  return 'sistema';
}

const consultaEscuro =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

function resolver(pref: PreferenciaTema): TemaAplicado {
  if (pref === 'sistema') return consultaEscuro?.matches ? 'escuro' : 'claro';
  return pref;
}

function prefereMenosMovimento() {
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

let preferencia: PreferenciaTema = typeof window !== 'undefined' ? lerPreferencia() : 'sistema';
let estado = { preferencia, aplicado: resolver(preferencia) };
const ouvintes = new Set<() => void>();
let timerTransicao: number | undefined;

function aplicar(animar: boolean) {
  const aplicado = resolver(preferencia);
  const raiz = document.documentElement;
  const mudou = raiz.classList.contains('dark') !== (aplicado === 'escuro');

  // Cruzamento curto das cores, só se o usuário não pediu menos movimento
  if (mudou && animar && !prefereMenosMovimento()) {
    raiz.classList.add('tema-trocando');
    window.clearTimeout(timerTransicao);
    timerTransicao = window.setTimeout(() => raiz.classList.remove('tema-trocando'), 260);
  }

  raiz.classList.toggle('dark', aplicado === 'escuro');
  raiz.style.colorScheme = aplicado === 'escuro' ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_BARRA[aplicado]);

  if (estado.preferencia !== preferencia || estado.aplicado !== aplicado) {
    estado = { preferencia, aplicado };
    ouvintes.forEach((ouvinte) => ouvinte());
  }
}

export function definirTema(nova: PreferenciaTema) {
  preferencia = nova;
  try {
    localStorage.setItem(CHAVE, nova);
  } catch {
    // Sem storage a escolha vale só nesta sessão
  }
  aplicar(true);
}

if (typeof window !== 'undefined') {
  // Garante o estado certo mesmo se o script do index.html não tiver rodado
  aplicar(false);
  consultaEscuro?.addEventListener?.('change', () => {
    if (preferencia === 'sistema') aplicar(true);
  });
  // Outra aba mudou a preferência
  window.addEventListener('storage', (e) => {
    if (e.key === CHAVE) {
      preferencia = lerPreferencia();
      aplicar(true);
    }
  });
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function useTema() {
  const atual = useSyncExternalStore(assinar, () => estado, () => estado);
  return { ...atual, definirTema };
}

export function rotuloPreferencia(pref: PreferenciaTema) {
  return OPCOES_TEMA.find((o) => o.valor === pref)?.rotulo ?? 'Sistema';
}
