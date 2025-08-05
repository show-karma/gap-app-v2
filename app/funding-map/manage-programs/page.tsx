/* eslint-disable @next/next/no-img-element */
import { Metadata } from "next";
import { defaultMetadata } from "@/utilities/meta";
import ManageProgramsWrapper from "@/components/Pages/ProgramRegistry/ManageProgramsWrapper";

export const metadata: Metadata = {
  title: `Karma GAP - Grant Program Aggregator`,
  description: `Find all the funding opportunities across web3 ecosystem.`,
  twitter: {
    creator: defaultMetadata.twitter.creator,
    site: defaultMetadata.twitter.site,
    card: "summary_large_image",
  },
  openGraph: {
    url: defaultMetadata.openGraph.url,
    title: `Karma GAP - Grant Program Aggregator`,
    description: `Find all the funding opportunities across web3 ecosystem.`,
    images: defaultMetadata.openGraph.images.map((image) => ({
      url: image,
      alt: `Karma GAP - Grant Program Aggregator`,
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
