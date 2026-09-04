import type { Metadata } from "next";
import { PROJECT_NAME } from "@/constants/brand";
import { safeJsonLdStringify } from "@/utilities/jsonLd";
import { SITE_URL } from "@/utilities/meta";
import { getCommunityDetailsCached } from "@/utilities/queries/v2/getCommunityData.cached";

type Props = {
  children: React.ReactNode;
  params: Promise<{ communityId: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ communityId: string }>;
}): Promise<Metadata> {
  const { communityId } = await params;
  const community = await getCommunityDetailsCached(communityId);
  const communityName = community?.details?.name || communityId;

  return {
    title: `Donate to ${communityName} Projects | ${PROJECT_NAME}`,
    description: `Support projects in the ${communityName} ecosystem by donating directly to grantees. Browse programs, select projects, and contribute to builders on ${PROJECT_NAME}.`,
  };
}

export default async function DonateLayout({ children, params }: Props) {
  const { communityId } = await params;
  // The cached twin. Uncached, this read is what stopped all three donate
  // routes from prerendering (--debug-prerender named lines 27-29 here): `api.*`
  // is axios, so it never reaches Next's patched fetch and no fetch-cache option
  // applies -- "use cache" is the only lever. The `await params` above it
  // resolves from the build-time community sample.
  const community = await getCommunityDetailsCached(communityId);
  const communityName = community?.details?.name || communityId;

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data requires dangerouslySetInnerHTML
        dangerouslySetInnerHTML={{
          __html: safeJsonLdStringify({
            "@context": "https://schema.org",
            "@type": "DonateAction",
            name: `Donate to ${communityName} Projects`,
            recipient: {
              "@type": "Organization",
              name: communityName,
            },
            url: `${SITE_URL}/community/${communityId}/donate`,
          }),
        }}
      />
      {children}
    </>
  );
}
