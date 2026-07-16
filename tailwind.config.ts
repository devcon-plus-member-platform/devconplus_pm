import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#3b5ee8",
          light: "#5b7cf0",
          50:  "#f0f4ff",
          100: "#dce6fd",
          200: "#c0d0fb",
          300: "#94b0f8",
          400: "#6085f3",
          500: "#3b5ee8",
          600: "#2a44d4",
          700: "#2234b0",
          800: "#222e8f",
          900: "#1e2970",
          950: "#151b47",
        },
        // Navy sidebar gradient
        navy: {
          DEFAULT: "#1b2454",
          from: "#1b2454",
          to: "#111737",
        },
        // App surfaces
        surface: {
          DEFAULT: "#f5f6fb",
          card: "#ffffff",
          border: "#e9ebf3",
        },
        // Semantic status/priority/severity accents
        accent: {
          emerald: "#10b981", // done / pass
          amber: "#f59e0b",   // help
          orange: "#f97316",  // review / blocked
          violet: "#8b5cf6",
          rose: "#ef4444",    // critical / fail
        },
      },
      backgroundImage: {
        "navy-gradient": "linear-gradient(180deg, #1b2454 0%, #111737 100%)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
