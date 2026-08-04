import { FILINGS_STATS } from "./stats";

/**
 * FAQ copy for the find-funders landing page — the direct-answer content for
 * the funder-discovery questions the page is meant to answer (DEV-595,
 * experiment E5 in artifacts/aeo-measurement/experiments.md).
 *
 * Three renderers share this array and must stay in sync word for word:
 *
 * - `components/landing-faq.tsx` — the FAQ section inside the interactive
 *   landing page;
 * - `components/find-funders-noscript-hero.tsx` — the root layout's
 *   crawler-visible replica for readers that do not execute JavaScript
 *   (the page's own HTML streams as a hidden chunk, see that file);
 * - the FAQPage JSON-LD emitted by `app/nonprofits/find-funders/page.tsx`,
 *   so the structured data never claims something a reader cannot see.
 *
 * Lives in lib/ (not next to a client component) because the noscript replica
 * is a Server Component: importing values from a `"use client"` module would
 * turn them into client references it cannot read.
 *
 * Every factual claim below traces to already-reviewed copy or code:
 * data coverage and freshness from `./stats` and the landing data section;
 * free access from the connect guide ("Is it free?"); the MCP connector URL
 * and sign-in flow from `./install-configs` and the /connect guides; giving
 * history, officers, and check-size research from the shipped agent copy in
 * `landing-page-client.tsx`.
 */
export interface FindFundersFaqEntry {
  question: string;
  answer: string;
}

export const FIND_FUNDERS_FAQS: FindFundersFaqEntry[] = [
  {
    question: "How does a small nonprofit start finding funders?",
    answer: `Start from the public record: every U.S. private foundation files a Form 990-PF each year listing the grants it actually paid. Karma Find Funders indexes over ${FILINGS_STATS.countLong} IRS 990 and 990-PF filings, so you can ask in plain English — by cause area, geography, or check size — and get a ranked prospect list with every figure cited to the filing it came from. You can try it on this page without signing up.`,
  },
  {
    question: "Does Karma show a foundation's past grants and giving history before I apply?",
    answer:
      "Yes. The research agent pulls a funder's giving history, officers, peer co-funders, and historical priorities from its 990 record, and every funder, grant, and dollar figure links back to the actual filing.",
  },
  {
    question: "How can I estimate a funder's typical grant size from its past grants?",
    answer:
      "A foundation's 990-PF lists each grant it paid and the amount, so recent filings show its real check-size patterns. Ask the agent for a funder's recent grants and typical amounts — or start from a constraint, like funders of refugee resettlement giving over $250k since 2024 — and it answers from the filed amounts, cited back to the source filings.",
  },
  {
    question: "Can I use ChatGPT or Claude to find foundations that fund my nonprofit?",
    answer:
      "Yes. Karma Find Funders is available as a connector for Claude and ChatGPT: add gapapi.karmahq.xyz/mcp as a custom connector (MCP), sign in to Karma once, and funder questions in your chats run against the indexed 990 data. Step-by-step setup guides live at karmahq.xyz/nonprofits/find-funders/connect.",
  },
  {
    question: "Is Karma Find Funders free for nonprofits?",
    answer:
      "Connecting and asking questions is free. A paid tier may be added later for high-volume usage, but the core prospecting agent stays free for nonprofits. You can also try a search on this page without creating an account.",
  },
  {
    question: "What data does Karma Find Funders search?",
    answer: `IRS 990 and 990-PF filings for U.S. private foundations and public charities that file annually — over ${FILINGS_STATS.countLong} filings covering ${FILINGS_STATS.dollarsTracked} in philanthropic assets and seven years of giving history, kept current as new filings are published. Every answer cites the filing it came from.`,
  },
  {
    question: "How do we screen out funders whose geographic or budget limits rule us out?",
    answer:
      "Put the constraints in the question — geography, foundation asset size, check size, cause area — and the agent filters against what the filings show, for example family foundations under $50M that funded youth literacy in the Midwest. Funders whose actual giving does not match your profile drop off the list before you spend time on an application.",
  },
  {
    question: "How is Karma Find Funders different from a grant research database?",
    answer:
      "Conventional grant research tools are typically filter-and-export databases operated through their own dashboards. Karma Find Funders is conversational: you describe what you need in plain English — on this page or inside Claude or ChatGPT — and the agent searches the indexed 990 filings and returns a ranked, cited prospect list.",
  },
];
