import { PROJECT_NAME } from "@/constants/brand";

export const ogMeta = {
  url: "https://www.karmahq.xyz/",
  siteName: `${PROJECT_NAME} - Where builders get funded and ecosystems grow`,
  type: "website",
  images: ["https://www.karmahq.xyz/images/homepage/builder-hero.png"],
};

export const twitterMeta = {
  card: "summary_large_image",
  title: `${PROJECT_NAME} - Where builders get funded and ecosystems grow`,
  description:
    "Karma is a platform for builders and ecosystems. Builders showcase their work and build reputation. Ecosystems use our full stack solution to allocate funding and grow their ecosystems.",
  creator: "@karmahq_",
  creatorId: "1445787271513341963",
  site: "https://karmahq.xyz",
  images: ["https://www.karmahq.xyz/images/homepage/builder-hero.png"],
};

export const defaultMetadata = {
  title: `${PROJECT_NAME} - Where builders get funded and ecosystems grow`,
  description:
    "Karma is a platform for builders and ecosystems. Builders showcase their work and build reputation. Ecosystems use our full stack solution to allocate funding and grow their ecosystems.",
  icons: ["/favicon.ico"],
  openGraph: {
    ...ogMeta,
  },
  twitter: {
    ...twitterMeta,
  },
};

export const customMetadata = ({
  title = `${PROJECT_NAME} - Where builders get funded and ecosystems grow`,
  description = "Karma is a platform for builders and ecosystems. Builders showcase their work and build reputation. Ecosystems use our full stack solution to allocate funding and grow their ecosystems.",
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
