import type { Metadata } from "next";
import { PROJECT_NAME } from "@/constants/brand";
import { CANONICAL_ORIGIN } from "@/utilities/domains";

export const SITE_URL = CANONICAL_ORIGIN;

export const DEFAULT_TITLE = `${PROJECT_NAME} - AI powered funding software that does the work for you`;
export const DEFAULT_DESCRIPTION =
  "AI-powered software for grants, hackathons, and RFPs. Automated evaluation, milestone tracking, and impact reporting for lean teams.";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/homepage/funder-benefit-01.png`;

// Entity-level description for Organization JSON-LD, which the root layout
// renders on every route. Kept separate from DEFAULT_DESCRIPTION, which is a
// per-page metadata fallback: this one has to describe everything Karma does,
// not what any single page is about.
export const ORGANIZATION_DESCRIPTION =
  "Karma is funding infrastructure for philanthropy. Foundations run grant programs end to end — applications, evaluation, milestone tracking, disbursement, and impact reporting. Donor advisors build ranked nonprofit shortlists with compliance checks, activity scores, and mission match. Nonprofits build funder-facing profiles and find aligned foundations, grounded in IRS 990 filings. Available in-app and to AI agents via MCP.";

export const ogMeta = {
  url: SITE_URL,
  siteName: DEFAULT_TITLE,
  type: "website",
  images: [DEFAULT_OG_IMAGE],
};

export const twitterMeta = {
  card: "summary_large_image" as const,
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  creator: "@karmahq_",
  creatorId: "1445787271513341963",
  site: "@karmahq_",
  images: [DEFAULT_OG_IMAGE],
};

export const defaultMetadata: Metadata = {
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${PROJECT_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  // No `icons` here: pages spread this object, and a hardcoded icon would
  // override the per-tenant favicon set by the root layout on whitelabel
  // domains. The root layout defines the default Karma icons itself.
  openGraph: {
    ...ogMeta,
  },
  twitter: {
    ...twitterMeta,
  },
};

export const customMetadata = ({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path,
  ogType = "website",
  robots,
  images,
}: {
  title?: string;
  description?: string;
  path?: string;
  ogType?: "website" | "article";
  robots?: { index: boolean; follow: boolean };
  images?: Array<{ url: string; width?: number; height?: number; alt?: string }>;
}): Metadata => {
  const ogImages = images ?? ogMeta.images;
  const twitterImages = images ? images.map((img) => img.url) : twitterMeta.images;

  return {
    title,
    description,
    ...(path && {
      alternates: {
        canonical: path,
      },
    }),
    ...(robots && { robots }),
    openGraph: {
      ...ogMeta,
      type: ogType,
      title,
      description,
      ...(path && { url: `${SITE_URL}${path}` }),
      images: ogImages,
    },
    twitter: {
      ...twitterMeta,
      title,
      description,
      images: twitterImages,
    },
  };
};
