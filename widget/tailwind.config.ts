import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./widget/**/*.tsx",
    "./components/AgentChat/ChatBubbleShell.tsx",
    "./components/ui/avatar.tsx",
    "./components/ui/button.tsx",
    "./components/ui/input-group.tsx",
    "./components/ui/input.tsx",
    "./components/ui/textarea.tsx",
    "./components/ui/spinner.tsx",
    "./src/components/ai-elements/conversation.tsx",
    "./src/components/ai-elements/message.tsx",
  ],
  theme: {
    extend: {
      colors: {
        /* Theme colors use hsl + <alpha-value> so Tailwind opacity modifiers work.
           The CSS variables (--kc-*) are set on .karma-chat in widget.css. */
        border: "hsl(var(--kc-border) / <alpha-value>)",
        background: "hsl(var(--kc-background) / <alpha-value>)",
        foreground: "hsl(var(--kc-foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--kc-card) / <alpha-value>)",
          foreground: "hsl(var(--kc-card-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--kc-muted) / <alpha-value>)",
          foreground: "hsl(var(--kc-muted-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--kc-secondary) / <alpha-value>)",
          foreground: "hsl(var(--kc-secondary-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--kc-accent) / <alpha-value>)",
          foreground: "hsl(var(--kc-accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--kc-destructive) / <alpha-value>)",
          subtle: "hsl(var(--kc-destructive-subtle) / <alpha-value>)",
        },
        input: "hsl(var(--kc-input) / <alpha-value>)",
        ring: "hsl(var(--kc-ring) / <alpha-value>)",
        /* Brand colors — match main app's tailwind.config.js (hex values).
           Hex works natively with Tailwind opacity modifiers like /10, /90. */
        brand: {
          blue: "#4C6FFF",
          darkblue: "#101828",
          lightblue: "#EEF4FF",
          /* Teal palette — matches main app's brand colors for buttons etc. */
          400: "#58daba",
          500: "#2ed1a8",
          950: "#061d18",
        },
      },
      borderRadius: {
        DEFAULT: "var(--kc-radius, 0.5rem)",
      },
      boxShadow: {
        "primary-button":
          "0 1px 2px 0 rgba(0, 0, 0, 0.08), 0 2px 8px 0 rgba(46, 209, 168, 0.15), inset 0 2px 0 0 rgba(255, 255, 255, 0.15), inset 0 -2px 2px 0 rgba(0, 0, 0, 0.08)",
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};

export default config;
