import type { Metadata } from "next";
import { AskKarmaPage } from "@/src/features/ask-karma/components/ask-karma-page";
import { getAskKarmaConfig } from "@/src/features/ask-karma/config";
import { SITE_URL, twitterMeta } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";
import { getWhitelabelContext } from "@/utilities/whitelabel-server";

// Metadata is intentionally tenant-agnostic. The agent that answers these
// questions is Karma's regardless of which whitelabel surface the user
// arrives from, so the title/description shouldn't read "Ask Filecoin" or
// "Ask Optimism". Whitelabel branding still applies to the on-page chrome.
const STATIC_TITLE = "Ask Karma";
const STATIC_DESCRIPTION =
  "Ask anything about funding rounds, project progress, milestones, and ecosystem insights.";

export const metadata: Metadata = {
  title: STATIC_TITLE,
  description: STATIC_DESCRIPTION,
  alternates: { canonical: PAGES.ASK_KARMA },
  twitter: { ...twitterMeta, title: STATIC_TITLE, description: STATIC_DESCRIPTION },
  openGraph: {
    type: "website",
    url: `${SITE_URL}${PAGES.ASK_KARMA}`,
    title: STATIC_TITLE,
    description: STATIC_DESCRIPTION,
  },
};

export default async function RootAskKarmaPage() {
  // Resolve the active community for the page component (drives the config
  // lookup + the in-page communityId context). Independent from the static
  // metadata above.
  const ctx = await getWhitelabelContext();
  const tenantId = ctx.tenantConfig?.id ?? "karma";
  const communitySlug = ctx.communitySlug ?? undefined;
  const config = getAskKarmaConfig(tenantId);

  return <AskKarmaPage config={config} communityId={communitySlug} />;
}
