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
      },
    },
  },
  plugins: [],
};
export default config;
