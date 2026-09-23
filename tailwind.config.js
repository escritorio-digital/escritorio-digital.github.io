/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Hacemos que los colores de Tailwind apunten a nuestras variables CSS
        'custom-bg': 'var(--color-bg)',
        'widget-bg': 'var(--color-widget-bg)',
        'widget-header': 'var(--color-widget-header)',
        'widget-header-text': 'var(--color-widget-header-text, var(--color-text-light))',
        'accent': 'var(--color-accent)',
        'text-light': 'var(--color-text-light)',
        'text-dark': 'var(--color-text-dark)',
        // La línea que faltaba para el borde blanco
        'custom-border': 'var(--color-border)', 
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
