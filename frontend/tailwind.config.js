/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          fill: 'var(--color-primary-fill)',
          light: 'var(--color-primary-light)',
          subtle: 'var(--color-primary-subtle)',
        },
        lavender: {
          soft: 'var(--color-lavender-soft)',
          light: 'var(--color-lavender-light)',
          border: 'var(--color-lavender-border)',
        },
        peach: {
          soft: 'var(--color-peach-soft)',
          light: 'var(--color-peach-light)',
          border: 'var(--color-peach-border)',
        },
        sage: {
          soft: 'var(--color-sage-soft)',
          light: 'var(--color-sage-light)',
          text: 'var(--color-sage-text)',
          border: 'var(--color-sage-border)',
        },
        amber: {
          soft: 'var(--color-amber-soft)',
          light: 'var(--color-amber-light)',
          text: 'var(--color-amber-text)',
          border: 'var(--color-amber-border)',
        },
        text: {
          main: 'var(--color-text-main)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          light: 'var(--color-text-light)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          light: 'var(--color-border-light)',
          dark: 'var(--color-border-dark)',
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
        'soft': 'var(--shadow-soft)',
        'soft-hover': 'var(--shadow-hover)',
        'subtle': 'var(--shadow-subtle)',
        'elevation': 'var(--shadow-elevation)',
      },
      lineHeight: {
        'relaxed-wellness': '1.625',
      },
    },
  },
  plugins: [],
}
