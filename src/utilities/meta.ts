export const ogMeta = {
  url: "https://gap.karmahq.xyz/",
  siteName: "Karma GAP - Grantee Accountability Protocol",
  type: "website",
  images: ["https://gap.karmahq.xyz/assets/previews/homepage.png"],
};

export const twitterMeta = {
  card: "summary_large_image",
  title: "Karma GAP - Grantee Accountability Protocol",
  description:
    "GAP is a protocol to help community get visibility into grantee progress and grantees to build reputation.",
  creator: "@karmahq_",
  creatorId: "1445787271513341963",
  site: "https://gap.karmahq.xyz",
  images: ["https://gap.karmahq.xyz/assets/previews/homepage.png"],
};

export const defaultMetadata = {
  title: "Karma GAP - Grantee Accountability Protocol",
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
  title = "Karma GAP - Grantee Accountability Protocol",
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
