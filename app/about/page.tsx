import type { Metadata } from "next";
import Link from "next/link";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "About",
  description:
    "Karma is a platform that helps ecosystems allocate funding transparently and helps builders share progress, earn reputation, and get discovered.",
  path: "/about",
});

const styles = {
  h1: "text-3xl font-bold text-black dark:text-white",
  h2: "text-xl font-bold text-black dark:text-white mt-8",
  p: "text-base text-black dark:text-white mt-4",
  ul: "list-disc list-inside mt-4 space-y-2",
  li: "text-base text-zinc-700 dark:text-zinc-300",
  a: "text-blue-500 underline",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className={styles.h1}>About Karma</h1>

      <p className={styles.p}>
        Karma is a platform that helps ecosystems allocate funding transparently and helps builders
        share their progress, earn reputation, and get discovered for more opportunities. Funders
        use Karma to coordinate grant programs end-to-end — from application intake through
        milestone tracking, evaluation, payout, and impact reporting. Builders use it to publish
        project profiles, claim grants, post updates, and prove delivery on-chain.
      </p>

      <h2 className={styles.h2}>What we do</h2>
      <p className={styles.p}>
        Karma turns the messy operational work of running a funding program — Google Forms,
        Airtable, Discord, Notion, spreadsheet trackers — into one workflow:
      </p>
      <ul className={styles.ul}>
        <li className={styles.li}>
          <strong>Project profiles</strong> with verifiable on-chain attestations of milestones,
          grants, and impact indicators
        </li>
        <li className={styles.li}>
          <strong>Funding programs</strong> with configurable intake forms, reviewer workflows, and
          AI-assisted evaluation
        </li>
        <li className={styles.li}>
          <strong>Milestone tracking</strong> with completion attestations submitted by builders and
          verified by funders
        </li>
        <li className={styles.li}>
          <strong>Payout coordination</strong> across 8 blockchain networks (Optimism, Arbitrum One,
          Polygon, Base, Celo, Scroll, Lisk, Sei) with multi-signature support and disbursement
          auditing
        </li>
        <li className={styles.li}>
          <strong>Impact measurement</strong> through self-reported indicators tied back to specific
          funded work
        </li>
      </ul>

      <h2 className={styles.h2}>How we are different</h2>
      <p className={styles.p}>
        Most grant operations today are stitched together from generic tools. Karma replaces that
        stack with software designed specifically for funding-program workflows, with native
        blockchain attestations for verifiable execution history. Public read access for anyone (no
        sign-in to browse projects or programs); OAuth or API key for authenticated operations.
      </p>

      <h2 className={styles.h2}>For developers and AI agents</h2>
      <p className={styles.p}>
        Karma exposes an MCP (Model Context Protocol) server so AI agents can discover programs,
        draft applications, audit milestones, and analyze impact data directly. See our{" "}
        <Link className={styles.a} href="/mcp/connect">
          MCP setup guide
        </Link>{" "}
        and the{" "}
        <Link className={styles.a} href="/for-agents">
          For AI Agents
        </Link>{" "}
        landing page.
      </p>

      <h2 className={styles.h2}>Contact</h2>
      <p className={styles.p}>
        For partnership inquiries, support, or general questions: info@karmahq.xyz
      </p>
    </main>
  );
}
