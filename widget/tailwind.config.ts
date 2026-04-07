import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./widget/**/*.tsx",
    "./components/ui/avatar.tsx",
    "./components/ui/badge.tsx",
    "./components/ui/button.tsx",
    "./components/ui/spinner.tsx",
    "./src/components/ai-elements/conversation.tsx",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--kc-border, 220 13% 91%))",
        background: "hsl(var(--kc-background, 0 0% 100%))",
        foreground: "hsl(var(--kc-foreground, 224 71% 4%))",
        card: {
          DEFAULT: "hsl(var(--kc-card, 0 0% 100%))",
          foreground: "hsl(var(--kc-card-foreground, 224 71% 4%))",
        },
        muted: {
          DEFAULT: "hsl(var(--kc-muted, 220 14% 96%))",
          foreground: "hsl(var(--kc-muted-foreground, 220 9% 46%))",
        },
        destructive: {
          DEFAULT: "hsl(var(--kc-destructive, 0 84% 60%))",
          subtle: "hsl(var(--kc-destructive-subtle, 0 84% 97%))",
        },
        "brand-blue": "hsl(var(--kc-brand-blue, 210 100% 50%))",
        ring: "hsl(var(--kc-ring, 215 20% 65%))",
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};

export default config;
