import type { Metadata } from "next";
import { PROJECT_NAME } from "@/constants/brand";

export const SITE_URL = "https://www.karmahq.xyz";

export const DEFAULT_TITLE = `${PROJECT_NAME} - AI powered funding software that does the work for you`;
export const DEFAULT_DESCRIPTION =
  "AI-powered software for grants, hackathons, and RFPs. Automated evaluation, milestone tracking, and impact reporting for lean teams.";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/homepage/funder-benefit-01.png`;

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
  icons: {
    icon: "/favicon.ico",
  },
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
