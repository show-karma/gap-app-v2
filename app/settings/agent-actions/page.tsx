import type { Metadata } from "next";
import { SettingsAgentActionsPage } from "@/components/Pages/SettingsAgentActions/SettingsAgentActionsPage";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Agent actions — Karma settings",
  description: "Review, approve, or reject the actions your AI agents have proposed on Karma.",
  path: "/settings/agent-actions",
  robots: { index: false, follow: false },
});

interface PageProps {
  searchParams: Promise<{ item?: string | string[] }>;
}

// The `?item=<id>` deep link (from an agent's approvalUrl) is resolved here on
// the server and passed down as a prop, so the client page needs neither
// useSearchParams() nor a Suspense boundary.
export default async function Page({ searchParams }: PageProps) {
  const { item } = await searchParams;
  return <SettingsAgentActionsPage highlightedId={typeof item === "string" ? item : null} />;
}
