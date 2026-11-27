import type { Config } from "tailwindcss";
// AGOOJIYÉ identity, sampled from the logo: ink #0c0c0c and gold #c79a2b.
// gold-700/800 are the text-safe shades on white (WCAG AA); gold-500 is for fills and accents.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0c0c0c", 800: "#1c1c1c", 700: "#2a2a2a" },
        gold: { 50: "#fbf7ec", 100: "#f5ebcf", 200: "#ead59c", 300: "#dcbc66", 400: "#d0a943", 500: "#c79a2b", 600: "#a87f1f", 700: "#85641a", 800: "#6b5018", 900: "#5a4318" },
      },
    },
  },
  plugins: [],
};
export default config;
