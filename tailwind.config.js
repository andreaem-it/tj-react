/** @type {import('tailwindcss').Config}
 * Nota: con Tailwind v4 la palette e la tipografia sono definite in app/globals.css
 * tramite @theme. Questo file è mantenuto per riferimento e compatibilità.
 */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#1a1a1a",
        foreground: "#ffffff",
        muted: "#aaaaaa",
        accent: "#f5a623",
        "header-bg": "#212121",
        "content-bg": "#2c2f3a",
        "sidebar-bg": "#252525",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
        ],
      },
    },
  },
  plugins: [],
};
