/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          primary: '#0D6E6E',
          light: '#1A8F8F',
          dim: 'rgba(13,110,110,0.12)',
        },
        bg: '#F0F2F5',
        stop: '#8B1A1A',
      },
      fontFamily: {
        display: ['DM Sans', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
