/**
 * Static copy for the find-funders landing hero.
 *
 * Shared by two renderers that must stay in sync word for word:
 *
 * - `components/landing-hero.tsx` — the interactive client hero;
 * - `app/nonprofits/find-funders/loading.tsx` — the server-rendered static
 *   fallback, which is the version of the hero a crawler that does not
 *   execute JavaScript actually sees (DEV-586).
 *
 * Lives in lib/ (not next to the client component) because the loading
 * fallback is a Server Component: importing values from a `"use client"`
 * module would turn them into client references it cannot read.
 */
export const HERO_TITLE_LINE_1 = "Stop hunting for funders.";
export const HERO_TITLE_LINE_2 = "Ask an agent.";

export const HERO_SUB =
  "AI agents that find the right foundations and funders for your mission, grounded in every IRS 990 on record. Ask in plain English, get a cited prospect list. Use it here, or take the agent with you to Claude or ChatGPT.";

export const HERO_CHIPS = [
  {
    cat: "PROSPECTING",
    text: "Family foundations under $50M that funded youth literacy in the Midwest",
  },
  {
    cat: "PROSPECTING",
    text: "Funders of refugee resettlement giving over $250k since 2024",
  },
  {
    cat: "PROSPECTING",
    text: "Foundations that funded our peers in the climate justice space last year",
  },
  {
    cat: "RESEARCH",
    text: "Top 10 foundations by total grants paid in 2025",
  },
  {
    cat: "PROSPECTING",
    text: "Build a tiered prospect list for a $2M environmental capital campaign",
  },
  {
    cat: "RESEARCH",
    text: "Foundations with a history of multi-year general operating support",
  },
] as const;
