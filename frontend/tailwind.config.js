/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6C3DE7',
        'primary-dark': '#4F46E5',
        accent: '#F59E0B',
        dark: '#0a0a0f',
        'dark-card': '#111120',
        'dark-border': '#1e1e3a',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #6C3DE7, #F59E0B)',
      }
    },
  },
  plugins: [],
}
