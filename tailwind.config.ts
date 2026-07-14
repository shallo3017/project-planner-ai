import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#070710',
          900: '#0b0b16',
          800: '#12121f',
        },
        // ── Brand retint ──────────────────────────────────────────────────
        // The app is written against `slate` (neutrals) and `indigo`/`violet`
        // (accent + gradient). Redefining those three scales here retints every
        // component at once — warm cream/near-black neutrals with a Corescent
        // orange→gold accent — without touching the components themselves.
        slate: {
          50: '#faf6f1', // page background (warm cream)
          100: '#f2ece4',
          200: '#e4dbd0', // borders
          300: '#cbbeaf', // faint icons
          400: '#9c8f80', // placeholders / muted
          500: '#6f6456', // secondary text
          600: '#4b433a', // body text (darker, stronger)
          700: '#352f28',
          800: '#211d18',
          900: '#12100d', // headings (near-black, warm)
          950: '#080706',
        },
        indigo: {
          // Muted terracotta — the brand orange, cooled down (less neon).
          50: '#fdf3ef',
          100: '#f9e4db',
          200: '#f0c8b6',
          300: '#e3a68c',
          400: '#d38260',
          500: '#c4603c', // accent
          600: '#b0512f', // primary buttons
          700: '#8f4026', // hover / accent text
          800: '#71341f',
          900: '#5b2b1a',
        },
        violet: {
          // Muted gold — the gradient end, desaturated to match.
          400: '#e2ab55',
          500: '#d59a3c', // gold
          600: '#c1852b',
          700: '#9c6a22',
        },
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        wave: {
          '0%,100%': { transform: 'scaleY(0.35)' },
          '50%': { transform: 'scaleY(1)' },
        },
        // Ambient hero glow — a slow, barely-perceptible drift.
        aurora: {
          '0%,100%': { transform: 'translate3d(-2%, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(3%, -4%, 0) scale(1.1)' },
        },
        'aurora-alt': {
          '0%,100%': { transform: 'translate3d(2%, 2%, 0) scale(1.05)' },
          '50%': { transform: 'translate3d(-3%, -2%, 0) scale(0.95)' },
        },
        breathe: {
          '0%,100%': { transform: 'scale(0.8)', opacity: '0.6' },
          '50%': { transform: 'scale(1.15)', opacity: '1' },
        },
        // Three-dot wave — each dot is delayed to make the wave travel.
        dot: {
          '0%,80%,100%': { transform: 'translateY(0)', opacity: '0.35' },
          '40%': { transform: 'translateY(-6px)', opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both',
        float: 'float 6s ease-in-out infinite',
        wave: 'wave 0.9s ease-in-out infinite',
        aurora: 'aurora 24s ease-in-out infinite',
        'aurora-alt': 'aurora-alt 30s ease-in-out infinite',
        'spin-slow': 'spin 1.6s linear infinite',
        'spin-reverse': 'spin 1.1s linear infinite reverse',
        breathe: 'breathe 1.8s ease-in-out infinite',
        dot: 'dot 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
