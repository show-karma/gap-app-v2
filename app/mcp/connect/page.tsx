import type { Metadata } from "next";
import { CONNECT_STEPS, MCP_FAQS } from "@/components/Pages/McpConnect/content";
import { McpConnectPage } from "@/components/Pages/McpConnect/McpConnectPage";
import { FAQJsonLd } from "@/components/Seo/FAQJsonLd";
import { HowToJsonLd } from "@/components/Seo/HowToJsonLd";
import { SoftwareApplicationJsonLd } from "@/components/Seo/SoftwareApplicationJsonLd";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Connect Karma to your AI app",
  description:
    "Add Karma's MCP server to Cursor, Claude Desktop, Codex, or any other MCP-compatible AI app to give it access to your projects, grants, and impact data.",
  path: "/mcp/connect",
});

export default function Page() {
  return (
    <>
      <SoftwareApplicationJsonLd />
      <FAQJsonLd questions={MCP_FAQS} />
      <HowToJsonLd
        name="Connect Karma to your AI app"
        description="Add Karma's MCP server to Cursor, Claude Desktop, or any other MCP-compatible client."
        steps={CONNECT_STEPS}
      />
      <McpConnectPage />
    </>
  );
}
