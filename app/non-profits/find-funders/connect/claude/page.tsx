import type { Metadata } from "next";
import { ConnectGuide } from "@/src/features/non-profits/components/connect-guide";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Add Karma Find Funders to Claude",
  description:
    "Step-by-step setup to add the Karma Find Funders MCP connector to Claude. Search foundations, pull 990 filings, and draft outreach inside your Claude chats.",
  path: "/non-profits/find-funders/connect/claude",
});

export default function ConnectClaudePage() {
  return <ConnectGuide provider="claude" />;
}
