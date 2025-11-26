/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import ManageProgramsWrapper from "@/components/Pages/ProgramRegistry/ManageProgramsWrapper";
import { PROJECT_NAME } from "@/constants/brand";
import { defaultMetadata } from "@/utilities/meta";

export const metadata: Metadata = {
  title: `${PROJECT_NAME} - Grant Program Aggregator`,
  description: `Find all the funding opportunities across web3 ecosystem.`,
  twitter: {
    creator: defaultMetadata.twitter.creator,
    site: defaultMetadata.twitter.site,
    card: "summary_large_image",
  },
  openGraph: {
    url: defaultMetadata.openGraph.url,
    title: `${PROJECT_NAME} - Grant Program Aggregator`,
    description: `Find all the funding opportunities across web3 ecosystem.`,
    images: defaultMetadata.openGraph.images.map((image) => ({
      url: image,
      alt: `${PROJECT_NAME} - Grant Program Aggregator`,
    })),
  },
  icons: [
    {
      rel: "icon",
      url: "/favicon.ico",
    },
  ],
};

const GrantProgramRegistry = () => {
  return <ManageProgramsWrapper />;
};

export default GrantProgramRegistry;
