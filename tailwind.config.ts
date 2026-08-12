import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './contexts/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          carbon:     '#2E333A',
          'carbon-lt':'#3D4450',
          gold:       '#F0C000',
          'gold-dk':  '#C9A000',
          black:      '#181818',
          border:     '#D8D8D8',
          muted:      '#909090', // deprecado — 3.19:1, no cumple WCAG AA. Usar brand.n500+ para texto.
          bg:         '#F5F6F7',
          // Escala neutra — ver DESIGN_SYSTEM.md. n500 es el piso de contraste
          // AA (4.83:1) para texto sobre blanco; n400 y más claros son solo
          // para decoración/bordes, nunca texto.
          n50:  '#F5F6F7',
          n100: '#ECEEF1',
          n200: '#E2E4E7',
          n300: '#D8D8D8',
          n400: '#AEB2B8',
          n500: '#6B7480',
          n600: '#4B5563',
          n700: '#374151',
          n800: '#2E333A',
          n900: '#181818',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
