import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
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
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
