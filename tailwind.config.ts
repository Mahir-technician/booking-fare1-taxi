// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: '#D4AF37',
        altBrand: '#B8860B',
        darkGold: '#DAA520',
        primaryBg: '#0D0D0D',
        secondaryBg: '#1A1A1A',
        'brand-gold': '#D4AF37',
        'brand-gold-light': '#F3E5AB',
        'brand-gold-dark': '#b08d22',
        'primary-black': '#050505',
        'secondary-black': '#121212',
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
        heading: ['Montserrat', 'sans-serif'],
      },
      animation: {
        'pulse-custom': 'pulse-gold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        }
      },
      boxShadow: {
        'gold-glow': '0 10px 40px -10px rgba(212, 175, 55, 0.4)',
      }
    }
  },
  plugins: [],
}

export default config