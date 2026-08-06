import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#16a34a",
          foreground: "#ffffff",
          light: "#22c55e",
          dark: "#15803d",
        },
        secondary: {
          DEFAULT: "#dcfce7",
          foreground: "#166534",
        },
        accent: {
          DEFAULT: "#f59e0b",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#f4f4f5",
          foreground: "#71717a",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [animate],
};
export default config;
