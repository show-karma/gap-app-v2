import type { Metadata } from "next";
import { ConnectGuide } from "@/src/features/non-profits/components/connect-guide";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Add Karma Find Funders to ChatGPT",
  description:
    "Step-by-step setup to add the Karma Find Funders MCP connector to ChatGPT. Search foundations, pull 990 filings, and draft outreach inside your ChatGPT chats.",
  path: "/nonprofits/find-funders/connect/chatgpt",
});

export default function ConnectChatGPTPage() {
  return <ConnectGuide provider="chatgpt" />;
}
