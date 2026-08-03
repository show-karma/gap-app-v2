import type { Metadata } from "next";
import { AGENT_FAQS } from "@/components/Pages/ForAgents/content";
import { ForAgentsPage } from "@/components/Pages/ForAgents/ForAgentsPage";
import { FAQJsonLd } from "@/components/Seo/FAQJsonLd";
import { SoftwareApplicationJsonLd } from "@/components/Seo/SoftwareApplicationJsonLd";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Karma MCP Server for AI Agents — Claude, ChatGPT, Cursor & Codex",
  description:
    "Karma provides a public MCP server at gapapi.karmahq.xyz/mcp. Connect Claude, ChatGPT, Cursor, or Codex to search funding programs, nonprofit and IRS 990 data, and grant history — with OAuth for actions on your behalf.",
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
