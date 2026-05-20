import type { Metadata } from "next";
import { AGENT_FAQS } from "@/components/Pages/ForAgents/content";
import { ForAgentsPage } from "@/components/Pages/ForAgents/ForAgentsPage";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { FAQJsonLd } from "@/components/Seo/FAQJsonLd";
import { SoftwareApplicationJsonLd } from "@/components/Seo/SoftwareApplicationJsonLd";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "For AI Agents — Karma",
  description:
    "Karma works with Claude, Cursor, and Codex. Connect via MCP to read projects, grants, and impact data — or take action on your behalf.",
  path: "/for-agents",
});

export default function Page() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "For AI Agents", url: "/for-agents" },
        ]}
      />
      <SoftwareApplicationJsonLd />
      <FAQJsonLd questions={AGENT_FAQS} />
      <ForAgentsPage />
    </>
  );
}
