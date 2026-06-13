/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Press Start 2P"', 'system-ui', 'sans-serif'],
        body: ['"Rajdhani"', 'system-ui', 'sans-serif'],
      },
      colors: {
        neon: {
          pink: '#ff2bd6',
          cyan: '#00f0ff',
          purple: '#9b5cff',
          green: '#39ff14',
          yellow: '#ffe600',
        },
        void: '#06040f',
      },
      boxShadow: {
        neon: '0 0 12px rgba(0,240,255,0.6), 0 0 28px rgba(255,43,214,0.35)',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '45%': { opacity: '0.85' },
          '50%': { opacity: '0.5' },
          '55%': { opacity: '0.9' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        flicker: 'flicker 3s infinite',
        floaty: 'floaty 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
