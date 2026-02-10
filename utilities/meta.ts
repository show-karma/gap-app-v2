import type { Metadata } from "next";
import { PROJECT_NAME } from "@/constants/brand";

export const SITE_URL = "https://karmahq.xyz";

export const DEFAULT_TITLE = `${PROJECT_NAME} - Where builders get funded and ecosystems grow`;
export const DEFAULT_DESCRIPTION =
  "Karma is a platform for builders and ecosystems. Builders showcase their work and build reputation. Ecosystems use our full stack solution to allocate funding and grow their ecosystems.";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/homepage/builder-hero.png`;

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
}: {
  title?: string;
  description?: string;
  path?: string;
}): Metadata => {
  return {
    title,
    description,
    ...(path && {
      alternates: {
        canonical: path,
      },
    }),
    openGraph: {
      ...ogMeta,
      title,
      description,
    },
    twitter: {
      ...twitterMeta,
      title,
      description,
    },
  };
};
