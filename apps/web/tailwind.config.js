/** @type {import('tailwindcss').Config} */

// As cores vêm de variáveis CSS (canais RGB) definidas em src/index.css:
// valores claros em :root e escuros em .dark. Assim o mesmo utilitário
// (ex.: text-primor-secondary) troca de tema sem editar o componente, e a
// opacidade do Tailwind (bg-primor-primary/70) continua funcionando.
const cor = (nome) => `rgb(var(--${nome}) / <alpha-value>)`;

export default {
  // Tema escuro pela classe .dark no <html>, aplicada antes da primeira pintura (index.html)
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Paleta da marca Primor. No claro os valores são os originais
        // (não alterar); no escuro cada papel tem um equivalente.
        'primor-primary': cor('primor-primary'), // âmbar
        'primor-secondary': cor('primor-secondary'), // tinta principal: marrom no claro, creme no escuro
        'primor-text-light': cor('primor-secondary'),
        'primor-text-dark': cor('primor-on-secondary'),
        'primor-bg': cor('primor-surface'),
        'primor-bg-light': cor('primor-bg-light'), // fundo das páginas
        'primor-gray-medium': cor('primor-gray-medium'),
        'primor-gray-dark': cor('primor-gray-dark'),

        // Tons derivados da paleta, usados onde a cor original não atinge
        // contraste WCAG AA (texto âmbar sobre fundo claro, borda de campos)
        'primor-primary-ink': cor('primor-primary-ink'), // âmbar para texto
        'primor-secondary-deep': cor('primor-secondary-deep'), // hover/pressionado da tinta
        'primor-muted': cor('primor-muted'), // texto secundário quente
        'primor-line': cor('primor-line'), // linhas decorativas
        'primor-line-strong': cor('primor-line-strong'), // borda de campo (WCAG 1.4.11)
        'primor-paper-deep': cor('primor-paper-deep'), // superfície rebaixada / hover

        // Papéis que o tema escuro precisa separar
        'primor-surface': cor('primor-surface'), // cartões, campos, modais (branco no claro)
        'primor-madeira': cor('primor-madeira'), // painéis em madeira: menu, barra, banner
        'primor-on-primary': cor('primor-on-primary'), // texto sobre o âmbar
        'primor-on-secondary': cor('primor-on-secondary'), // texto sobre a tinta (botão marrom/creme)
        'primor-realce': cor('primor-realce'), // lavagem âmbar: opção marcada, alerta informativo
        'primor-veu': cor('primor-veu'), // fundo atrás de modais e do menu
        'primor-placeholder': cor('primor-placeholder'),
        'primor-erro': cor('primor-erro'),
        'primor-erro-bg': cor('primor-erro-bg'),
        'primor-erro-ink': cor('primor-erro-ink'),
        'primor-sucesso': cor('primor-sucesso'),
        'primor-sucesso-bg': cor('primor-sucesso-bg'),
        'primor-sucesso-ink': cor('primor-sucesso-ink'),
      },
      fontFamily: {
        sans: ['"Geist Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fraunces Variable"', 'Georgia', 'serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        // Sombras tingidas de marrom, luz sempre vindo de cima (variam com o tema)
        chapa: 'var(--sombra-chapa)',
        'chapa-lg': 'var(--sombra-chapa-lg)',
      },
      zIndex: {
        topbar: '30',
        drawer: '40',
        modal: '50',
      },
    },
  },
  plugins: [],
}
