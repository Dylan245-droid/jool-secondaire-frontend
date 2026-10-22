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
        card: "var(--card)",
        "card-border": "var(--card-border)",
        primary: {
          DEFAULT: "var(--violet)",
          foreground: "#ffffff",
          light: "#f3e8fa",
          dark: "var(--violet-dark)",
        },
        secondary: {
          DEFAULT: "var(--muted)",
          foreground: "var(--foreground)",
        },
        violet: {
          DEFAULT: "var(--violet)",
          dark: "var(--violet-dark)",
        },
        rose: "var(--rose)",
        turquoise: "var(--turquoise)",
        noir: "var(--noir)",
        accent: {
          DEFAULT: "var(--rose)",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        border: "var(--border)",
      },
      fontFamily: {
        sans: ["'Google Sans Flex'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        brutal: "var(--shadow-brutal)",
        "brutal-sm": "var(--shadow-brutal-sm)",
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
