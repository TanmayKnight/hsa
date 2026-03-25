import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:   '#1B2D5E',   // Old Glory Navy
        accent:    '#B22234',   // Old Glory Crimson
        parchment: '#F8F5EF',   // warm newsprint background
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
      },
    },
  },
  plugins: [],
}

export default config
