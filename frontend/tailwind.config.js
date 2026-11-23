/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F7F6FB',
        surface: '#FFFFFF',
        primary: {
          DEFAULT: '#5554B8',
          hover: '#4645A7',
          light: '#E9E7FB',
          subtle: '#F0EFFC',
        },
        lavender: {
          soft: '#E9E7FB',
          light: '#F4F3FD',
          border: '#D9D5F4',
        },
        peach: {
          soft: '#F4DCCB',
          light: '#FCF5EF',
          border: '#E8C7B0',
        },
        sage: {
          soft: '#DCE9DF',
          light: '#F0F6F2',
          text: '#2D5A3A',
          border: '#BFD7C4',
        },
        amber: {
          soft: '#F6E6CC',
          light: '#FDF8F0',
          text: '#7A4D05',
          border: '#E7CCA0',
        },
        text: {
          main: '#25233B',
          secondary: '#625F78',
          muted: '#8E8AA7',
          light: '#B2AFCA',
        },
        border: {
          DEFAULT: '#E8E6F1',
          light: '#F0EFF7',
          dark: '#D5D1E5',
        },
      },
      fontFamily: {
        sans: ['"Satoshi"', '"General Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['"Cabinet Grotesk"', '"Satoshi"', 'sans-serif'],
      },
      borderRadius: {
        'card': '18px',
        'input': '12px',
        'button': '12px',
      },
      boxShadow: {
        'soft': '0 4px 24px rgba(91, 91, 214, 0.06)',
        'soft-hover': '0 8px 32px rgba(91, 91, 214, 0.10)',
        'subtle': '0 2px 10px rgba(91, 91, 214, 0.03)',
        'elevation': '0 12px 40px rgba(91, 91, 214, 0.08)',
      },
      lineHeight: {
        'relaxed-wellness': '1.625',
      },
    },
  },
  plugins: [],
}
