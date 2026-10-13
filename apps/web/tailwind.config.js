/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Paleta da marca Primor (não alterar)
        'primor-primary': '#F0A02D',
        'primor-secondary': '#603829',
        'primor-text-light': '#603829',
        'primor-text-dark': '#FFFFFF',
        'primor-bg': '#FFFFFF',
        'primor-bg-light': '#fbf7f4',
        'primor-gray-medium': '#e0e0e0',
        'primor-gray-dark': '#5a5a5a',

        // Tons derivados da paleta, usados onde a cor original não atinge
        // contraste WCAG AA (texto âmbar sobre fundo claro, borda de campos)
        'primor-primary-ink': '#9A5B0C', // âmbar escurecido: 5.1:1 sobre bg-light
        'primor-secondary-deep': '#4a2b1f', // hover/pressionado do marrom
        'primor-muted': '#6f5547', // texto secundário quente: 6.4:1 sobre bg-light
        'primor-line': '#e8dfd8', // linhas decorativas
        'primor-line-strong': '#9a8072', // borda de campo: 3.5:1 (WCAG 1.4.11)
        'primor-paper-deep': '#f3ebe4', // superfície um pouco mais escura que bg-light
      },
      fontFamily: {
        sans: ['"Geist Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fraunces Variable"', 'Georgia', 'serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        // Sombras tingidas de marrom, luz sempre vindo de cima
        chapa: '0 1px 0 rgba(96,56,41,0.06), 0 10px 24px -14px rgba(96,56,41,0.28)',
        'chapa-lg': '0 1px 0 rgba(96,56,41,0.08), 0 28px 56px -24px rgba(74,43,31,0.42)',
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
