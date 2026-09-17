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
      keyframes: {
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.4)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.95) translateY(-6px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "bell-ring": {
          "0%,100%": { transform: "rotate(0)" },
          "20%": { transform: "rotate(12deg)" },
          "40%": { transform: "rotate(-10deg)" },
          "60%": { transform: "rotate(6deg)" },
          "80%": { transform: "rotate(-4deg)" },
        },
      },
      animation: {
        "scale-in": "scale-in 0.2s ease-out",
        "pop-in": "pop-in 0.18s ease-out",
        "bell-ring": "bell-ring 0.5s ease-in-out",
      },
    },
  },
  plugins: [],
};