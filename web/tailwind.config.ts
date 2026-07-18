import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        night: '#0D1B2A',
        primary: '#2B5CAD',
        accent: '#B8863B',
        confirm: '#3A9463',
        brand: '#00B4FF',
        'brand-violet': '#9D4EDD',
        'brand-pink': '#FF4D8D',
        'brand-yellow': '#FFC107',
        'brand-green': '#22C55E',
        cream: '#FDFBF4',
        gold: { DEFAULT: '#F4C430', light: '#FFE9A8', dark: '#C8940F', deep: '#A8790E' },
      },
      fontFamily: {
        sora: ['var(--font-sora)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-18px) rotate(4deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 40px 4px rgba(244,196,48,0.35)' },
          '50%': { boxShadow: '0 0 70px 12px rgba(244,196,48,0.55)' },
        },
        drift: {
          '0%': { transform: 'translate(0,0)' },
          '100%': { transform: 'translate(-30px,-40px)' },
        },
        popIn: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 5s linear infinite',
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
        drift: 'drift 8s ease-in-out infinite alternate',
        'pop-in': 'popIn 0.4s ease',
      },
    },
  },
  plugins: [],
};
export default config;
