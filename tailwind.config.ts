import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif']
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px'
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(15, 23, 42, 0.05), 0 8px 20px -16px rgba(15, 23, 42, 0.18)'
      }
    }
  },
  plugins: []
};

export default config;
