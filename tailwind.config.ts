import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Warm light palette ─────────────────────────────────────────────────
        ivory:     "#F6F1E8",   // page background / form containers
        paper:     "#FFFFFF",   // panel / card surface (clean white)
        stoneLine: "#E4D9C8",   // warm stone border
        ink:       "#1D1B18",   // near-black text
        muted:     "#6B6257",   // warm brown secondary text

        // ── Brand accent ───────────────────────────────────────────────────────
        "gm-orange":       "#E8620A",
        "gm-orange-light": "#FDF0E8",
        "gm-orange-muted": "#F5A96B",

        // ── Accent shades ──────────────────────────────────────────────────────
        monk:    "#B96324",
        saffron: "#D88A33",
        sage:    "#657760",
      },
      boxShadow: {
        calm:  "0 18px 50px rgba(29, 27, 24, 0.06)",
        panel: "0 1px 2px rgba(29,27,24,0.04), 0 0 0 1px rgba(29,27,24,0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
