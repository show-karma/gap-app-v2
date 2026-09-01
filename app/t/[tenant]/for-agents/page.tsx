import type { Metadata } from "next";
import { AGENT_FAQS } from "@/components/Pages/ForAgents/content";
import { ForAgentsPage } from "@/components/Pages/ForAgents/ForAgentsPage";
import { FAQJsonLd } from "@/components/Seo/FAQJsonLd";
import { SoftwareApplicationJsonLd } from "@/components/Seo/SoftwareApplicationJsonLd";
import { customMetadata } from "@/utilities/meta";

// Rendered as "Connect Karma to your AI Agents | Karma" by the root layout's
// `%s | Karma` title template, matching the rest of the site.
const PAGE_TITLE = "Connect Karma to your AI Agents";

export const metadata: Metadata = customMetadata({
  title: PAGE_TITLE,
  description:
    "Connect Karma to your Claude, Cursor, or Codex to search funding programs, nonprofit and IRS 990 data, and grant history — or take actions on your behalf.",
  path: "/for-agents",
});

export default function Page() {
  return (
    <>
      <SoftwareApplicationJsonLd />
      <FAQJsonLd questions={AGENT_FAQS} />
      <ForAgentsPage />
    </>
  );
}
