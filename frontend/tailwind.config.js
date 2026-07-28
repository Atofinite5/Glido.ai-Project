/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9dffd',
          300: '#7cc5fc',
          400: '#36a9f9',
          500: '#0c8eea',
          600: '#0070c8',
          700: '#0159a2',
          800: '#064b86',
          900: '#0b3f6f',
        },
        glido: {
          dark: '#0b0d17',
          darker: '#07080f',
          accent: '#7c3aed',
          'accent-light': '#a78bfa',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
