import type { Metadata } from "next";
import { McpConnectPage } from "@/components/Pages/McpConnect/McpConnectPage";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Connect Karma to your AI app",
  description:
    "Add Karma's MCP server to Cursor, Claude Desktop, Codex, or any other MCP-compatible AI app to give it access to your projects, grants, and impact data.",
  path: "/mcp/connect",
});

export default function Page() {
  return <McpConnectPage />;
}
