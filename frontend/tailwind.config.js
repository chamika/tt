/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        emerald: {
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          900: '#064e3b',
        },
        slate: {
          50: '#f8fafc',
          200: '#e2e8f0',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        blue: {
          100: '#dbeafe',
          300: '#93c5fd',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        yellow: {
            50: '#fefce8',
            100: '#fef9c3',
            500: '#eab308',
            600: '#ca8a04',
            700: '#a16207',
            900: '#713f12',
        }
      },
    },
  },
  plugins: [],
}
