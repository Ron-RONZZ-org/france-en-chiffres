/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'french-blue': '#002395',
        'french-white': '#ffffff',
        'french-red': '#ed2939',
        'bg-dark': '#0b1120',
        'bg-card': '#111827',
        'bg-light': '#f8fafc',
        'text-dark': '#0f172a',
        'text-light': '#e2e8f0',
        'text-muted': '#94a3b8',
        'accent-gold': '#d4a843',
        border: '#1e293b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'Times New Roman', 'serif'],
      },
      maxWidth: {
        page: '1200px',
      },
      transitionDuration: {
        fast: '200ms',
        normal: '400ms',
        slow: '800ms',
      },
    },
  },
  plugins: [],
};
