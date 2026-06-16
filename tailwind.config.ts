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
          muted:      '#909090',
          bg:         '#F5F6F7',
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
