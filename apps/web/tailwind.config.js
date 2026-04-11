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
        'primor-primary': '#F0A02D',
        'primor-secondary': '#603829',
        'primor-text-light': '#603829',
        'primor-text-dark': '#FFFFFF',
        'primor-bg': '#FFFFFF',
        'primor-bg-light': '#fbf7f4',
        'primor-gray-medium': '#e0e0e0',
        'primor-gray-dark': '#5a5a5a',
      },
    },
  },
  plugins: [],
}
