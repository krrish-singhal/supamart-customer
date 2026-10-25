/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.js',
    './app.config.js',
    './src/**/*.{js,jsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: { green: '#0A7C47', amber: '#FFB020', ink: '#121712', shelf: '#F3F5F2' },
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#0A7C47',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          DEFAULT: '#0A7C47',
        },
        surface: {
          50: '#F3F5F2',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          DEFAULT: '#ffffff',
        },
        text: {
          primary: '#121712',
          secondary: '#64748b',
          tertiary: '#94a3b8',
        },
        border: {
          light: '#f1f5f9',
          DEFAULT: '#e2e8f0',
          dark: '#cbd5e1',
        }
      },
      fontFamily: {
        sans: ['PlusJakartaSans-Regular'],
        normal: ['PlusJakartaSans-Regular'],
        medium: ['PlusJakartaSans-SemiBold'],
        semibold: ['PlusJakartaSans-SemiBold'],
        bold: ['PlusJakartaSans-SemiBold'],
        extrabold: ['PlusJakartaSans-ExtraBold'],
        black: ['PlusJakartaSans-ExtraBold'],
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'soft': '0 8px 30px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
      },
      fontSize: {
        'h1': ['32px', { lineHeight: '40px' }],
        'h2': ['28px', { lineHeight: '36px' }],
        'h3': ['24px', { lineHeight: '32px' }],
        'h4': ['20px', { lineHeight: '28px' }],
        'sub1': ['18px', { lineHeight: '26px' }],
        'sub2': ['16px', { lineHeight: '24px' }],
        'sub3': ['14px', { lineHeight: '20px' }],
        'lbl1': ['13px', { lineHeight: '18px' }],
        'lbl2': ['12px', { lineHeight: '16px' }],
        'lbl3': ['11px', { lineHeight: '14px' }],
      }
    },
  },
  plugins: [],
};