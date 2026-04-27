import type { Config } from "tailwindcss";

// Tailwind v4: theme tokens go in globals.css @theme block.
// This file is kept for IDE auto-complete only.
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;
