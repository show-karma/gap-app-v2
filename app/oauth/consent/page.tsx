import type { Metadata } from "next";
import { OAuthConsentClient } from "@/components/Pages/OAuthConsent/OAuthConsentClient";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Authorize app access — Karma",
  description: "Review and approve an external app's request to access your Karma MCP tools.",
  path: "/oauth/consent",
  robots: { index: false, follow: false },
});

export default function Page() {
  return <OAuthConsentClient />;
}
