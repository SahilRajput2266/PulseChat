/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // Electric blue accent
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        dark: {
          bg: '#0B0E14',
          panel: '#11151E',
          card: '#161C27',
          surface: '#1E2535',
          border: '#242D3F',
          borderSubtle: '#1C2333',
          hover: '#222A3C',
          active: '#2A344B',
          textMuted: '#94A3B8',
          text: '#F1F5F9'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px -5px rgba(37, 99, 235, 0.4)',
        'glow-sm': '0 0 10px -2px rgba(37, 99, 235, 0.3)',
      }
    },
  },
  plugins: [],
}
