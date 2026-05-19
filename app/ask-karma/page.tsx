import type { Metadata } from "next";
import { AskKarmaPage } from "@/src/features/ask-karma/components/ask-karma-page";
import { getAskKarmaConfig } from "@/src/features/ask-karma/config";
import { SITE_URL, twitterMeta } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";
import { getWhitelabelContext } from "@/utilities/whitelabel-server";

async function resolveTenant() {
  const ctx = await getWhitelabelContext();
  const tenantId = ctx.tenantConfig?.id ?? "karma";
  const tenantName = ctx.tenantConfig?.name ?? "Karma";
  const communitySlug = ctx.communitySlug ?? undefined;
  return { tenantId, tenantName, communitySlug };
}

export async function generateMetadata(): Promise<Metadata> {
  const { tenantName } = await resolveTenant();
  const title = `Ask ${tenantName} — Karma Assistant`;
  const description = `Ask anything about ${tenantName} — funding rounds, project progress, milestones, and ecosystem insights.`;

  return {
    title,
    description,
    alternates: { canonical: PAGES.ASK_KARMA },
    twitter: { ...twitterMeta, title, description },
    openGraph: {
      type: "website",
      url: `${SITE_URL}${PAGES.ASK_KARMA}`,
      title,
      description,
    },
  };
}

export default async function RootAskKarmaPage() {
  const { tenantId, communitySlug } = await resolveTenant();
  const config = getAskKarmaConfig(tenantId);

  return <AskKarmaPage config={config} communityId={communitySlug} />;
}
