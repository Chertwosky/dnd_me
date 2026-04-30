import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#030712',
          900: '#07111f',
          850: '#0b1220',
          800: '#111827',
        },
        ember: {
          300: '#fbbf24',
          400: '#f59e0b',
          500: '#d97706',
        },
        arcane: {
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        rune: {
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
        },
        parchment: {
          100: '#fff7ed',
          200: '#fed7aa',
          300: '#fdba74',
        },
      },
      boxShadow: {
        'arcane-panel': '0 24px 80px rgba(2, 6, 23, 0.42)',
        'ember-glow': '0 0 36px rgba(245, 158, 11, 0.18)',
        'rune-glow': '0 0 32px rgba(34, 211, 238, 0.2)',
      },
      backgroundImage: {
        'table-radial':
          'radial-gradient(circle at 15% 10%, rgba(139, 92, 246, 0.2), transparent 30%), radial-gradient(circle at 85% 15%, rgba(34, 211, 238, 0.14), transparent 26%), linear-gradient(180deg, #030712 0%, #07111f 52%, #020617 100%)',
        'panel-sheen':
          'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02) 42%, rgba(245,158,11,0.08))',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};

export default config;
