/**
 * The AI tools the Karma Find Funders agent can be connected to.
 *
 * Single source of truth for the connector CTAs, which appear in three places
 * with different chrome but the same destinations: the landing page floating
 * card, the search workbench right rail, and the inline conversation banner.
 *
 * The brand marks are single-path black SVGs, so every consumer pairs them
 * with `dark:invert` to stay legible on the dark theme (same treatment as the
 * /mcp connect page).
 */
import { NON_PROFITS_PAGES } from "@/utilities/pages";

export interface ConnectTarget {
  /** Product name — callers format their own label, e.g. `Add to ${name}`. */
  name: string;
  href: string;
  logo: string;
}

export const CONNECT_TARGETS: readonly ConnectTarget[] = [
  {
    name: "Claude",
    href: NON_PROFITS_PAGES.CONNECT_CLAUDE,
    logo: "/images/mcp/claude.svg",
  },
  {
    name: "ChatGPT",
    href: NON_PROFITS_PAGES.CONNECT_CHATGPT,
    logo: "/images/mcp/openai.svg",
  },
] as const;
