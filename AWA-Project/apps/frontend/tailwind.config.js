/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Perłowo-złoto-srebrna paleta
        pearl: {
          50: '#FFFEF7',   // Białe perły
          100: '#F8F8FF',  // Perłowy
          200: '#F0F0F5',  // Lekko perłowy
        },
        gold: {
          400: '#FFE55C',  // Jasne złoto
          500: '#FFD700',  // Klasyczne złoto
          600: '#DAA520',  // Ciemne złoto
        },
        silver: {
          300: '#E5E4E2',  // Platynowy
          400: '#C0C0C0',  // Srebrny
          500: '#A8A8A8',  // Ciemny srebrny
        },
        champagne: '#F7E7CE',
      },
      fontFamily: {
        'futuristic': ['Audiowide', 'Orbitron', 'sans-serif'],
        'modern': ['Exo 2', 'Inter', 'system-ui'],
      },
      backdropBlur: {
        'glass': '15px',
      },
      animation: {
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-inset': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.4)',
      },
    },
  },
  plugins: [],
}
