/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "sans-serif"],
        serif: ["Cinzel", "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        brand: {
          deep: "#5B2E10",
          primary: "#D96B27",
          hover: "#BE581A",
          amber: "#E59850",
          cream: "#FAF8F5",
          surface: "#FFFFFF",
          sand: "#EBE3D7",
          softline: "#E2D8CC",
          canvas: "#F6F3EE",
          frost: "#FDF7F2",
          charcoal: "#2B2523",
          muted: "#706761",
          approved: "#2D7A4F",
          overdue: "#B91C1C",
          pending: "#D96B27",
          lightOrange: "#FBECE0",
          knowledge: "#FAF8F5",
          warmBorder: "#F6D5BD",
        },
      },
    },
  },
  plugins: [],
};