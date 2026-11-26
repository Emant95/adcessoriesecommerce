/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        warm: '#FFFEFC',
        cream: '#F5EEE6',
        ivory: '#FAF6F1',
        gold: { DEFAULT: '#C99A63', dark: '#A97C47' },
        rose: { soft: '#E8CFC7', DEFAULT: '#D9AFA2' },
        espresso: '#39291F',
        taupe: '#897D73',
        line: '#EAE0D6',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 24px -8px rgba(57, 41, 31, 0.12)',
        lift: '0 14px 34px -12px rgba(57, 41, 31, 0.22)',
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};
