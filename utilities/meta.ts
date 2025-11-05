import { PROJECT_NAME } from "@/constants/brand";

export const ogMeta = {
  url: "https://karmahq.xyz/",
  siteName: `${PROJECT_NAME} - Grantee Accountability Protocol`,
  type: "website",
  images: ["https://karmahq.xyz/assets/previews/homepage.png"],
};

export const twitterMeta = {
  card: "summary_large_image",
  title: `${PROJECT_NAME} - Grantee Accountability Protocol`,
  description:
    "GAP is a protocol to help community get visibility into grantee progress and grantees to build reputation.",
  creator: "@karmahq_",
  creatorId: "1445787271513341963",
  site: "https://karmahq.xyz",
  images: ["https://karmahq.xyz/assets/previews/homepage.png"],
};

export const defaultMetadata = {
  title: `${PROJECT_NAME} - Grantee Accountability Protocol`,
  description:
    "GAP is a protocol to help community get visibility into grantee progress and grantees to build reputation.",
  icons: ["/favicon.ico"],
  openGraph: {
    ...ogMeta,
  },
  twitter: {
    ...twitterMeta,
  },
};

export const customMetadata = ({
  title = `${PROJECT_NAME} - Grantee Accountability Protocol`,
  description = "GAP is a protocol to help community get visibility into grantee progress and grantees to build reputation.",
}) => {
  return {
    title,
    description,
    icons: ["/favicon.ico"],
    openGraph: {
      ...ogMeta,
      siteName: title,
    },
    twitter: {
      ...twitterMeta,
      title,
      description,
    },
  };
};
