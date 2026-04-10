import type { Metadata } from "next";
import { GrantAtlasSearch } from "@/src/features/grant-atlas/components/grant-atlas-chat";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Grant Atlas — Philanthropy Intelligence",
  description:
    "Search foundations, nonprofits, and grants using natural language. AI-powered search across IRS 990PF filings.",
  path: "/grant-atlas",
});

export default function GrantAtlasPage() {
  return (
    <main className="w-full">
      <GrantAtlasSearch />
    </main>
  );
}
