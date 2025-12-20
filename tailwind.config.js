/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#D9738E',      // Rose plus saturé
        secondary: '#A84A5A',    // Vieux rose plus intense
        accent: '#4AB5C2',       // Turquoise plus vif
        neutral: {
          light: '#F5F3EF',      // Blanc cassé
          support: '#D6C1C3',    // Gris rosé
        },
        text: {
          dark: '#1A1A1A',       // Noir plus profond pour meilleur contraste
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
