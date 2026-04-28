import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        parchment: "var(--color-bg)",
        burgundy: "var(--color-burgundy)",
        text: "var(--color-text)",
        borderTone: "var(--color-border)",
        mutedTone: "var(--color-muted)"
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Baskerville", "Georgia", "serif"],
        body: ["var(--font-libre)", "Georgia", "serif"]
      },
      boxShadow: {
        card: "0 18px 40px rgba(88, 37, 34, 0.08)"
      },
      maxWidth: {
        shell: "920px"
      },
      letterSpacing: {
        editorial: "0.04em"
      }
    }
  },
  plugins: []
};

export default config;
