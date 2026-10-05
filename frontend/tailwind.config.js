const plugin = require("tailwindcss/plugin");

/**
 * shadcn's "base-nova" preset defines these as Tailwind v4 `@custom-variant`
 * rules (in the `shadcn` package's bundled tailwind.css, meant to be
 * `@import`ed). This project is on Tailwind v3, which has no `@custom-variant`
 * at-rule, so the same selectors are registered here via the v3 plugin API
 * instead — needed for components/ui/tabs.tsx's `data-active`/`data-horizontal`/
 * `data-vertical` utility variants to actually generate CSS.
 */
const baseNovaVariants = plugin(function ({ addVariant }) {
  addVariant("data-open", ['&[data-state="open"]', "&[data-open]:not([data-open=\"false\"])"]);
  addVariant("data-closed", ['&[data-state="closed"]', "&[data-closed]:not([data-closed=\"false\"])"]);
  addVariant("data-checked", ['&[data-state="checked"]', "&[data-checked]:not([data-checked=\"false\"])"]);
  addVariant("data-unchecked", ['&[data-state="unchecked"]', "&[data-unchecked]:not([data-unchecked=\"false\"])"]);
  addVariant("data-selected", '&[data-selected="true"]');
  addVariant("data-disabled", ['&[data-disabled="true"]', "&[data-disabled]:not([data-disabled=\"false\"])"]);
  addVariant("data-active", ['&[data-state="active"]', "&[data-active]:not([data-active=\"false\"])"]);
  addVariant("data-horizontal", '&[data-orientation="horizontal"]');
  addVariant("data-vertical", '&[data-orientation="vertical"]');
});

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
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "oklch(var(--background) / <alpha-value>)",
        foreground: "oklch(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "oklch(var(--card) / <alpha-value>)",
          foreground: "oklch(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "oklch(var(--popover) / <alpha-value>)",
          foreground: "oklch(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: "oklch(var(--destructive) / <alpha-value>)",
        border: "oklch(var(--border) / <alpha-value>)",
        input: "oklch(var(--input) / <alpha-value>)",
        ring: "oklch(var(--ring) / <alpha-value>)",
        chart: {
          "1": "oklch(var(--chart-1) / <alpha-value>)",
          "2": "oklch(var(--chart-2) / <alpha-value>)",
          "3": "oklch(var(--chart-3) / <alpha-value>)",
          "4": "oklch(var(--chart-4) / <alpha-value>)",
          "5": "oklch(var(--chart-5) / <alpha-value>)",
        },
        sidebar: {
          DEFAULT: "oklch(var(--sidebar) / <alpha-value>)",
          foreground: "oklch(var(--sidebar-foreground) / <alpha-value>)",
          primary: "oklch(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground": "oklch(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent: "oklch(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground": "oklch(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "oklch(var(--sidebar-border) / <alpha-value>)",
          ring: "oklch(var(--sidebar-ring) / <alpha-value>)",
        },
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
  plugins: [baseNovaVariants],
};