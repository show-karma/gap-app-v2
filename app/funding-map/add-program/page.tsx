import React from "react";
import { NextSeo } from "next-seo";
import { defaultMetadata } from "@/utilities/meta";
import AddProgram from "@/components/Pages/ProgramRegistry/AddProgram";

export default function AddProgramPage() {
  const metadata = {
    title: "Karma GAP - Grant Program Registry",
    description:
      "Comprehensive list of all the grant programs in the web3 ecosystem.",
  };
  return (
    <>
      <NextSeo
        title={metadata.title}
        description={metadata.description}
        twitter={{
          handle: defaultMetadata.twitter.creator,
          site: defaultMetadata.twitter.site,
          cardType: "summary_large_image",
        }}
        openGraph={{
          url: defaultMetadata.openGraph.url,
          title: metadata.title,
          description: metadata.description,
          images: defaultMetadata.openGraph.images.map((image) => ({
            url: image,
            alt: metadata.title,
          })),
          // site_name: defaultMetadata.openGraph.siteName,
        }}
        additionalLinkTags={[
          {
            rel: "icon",
            href: "/images/favicon.png",
          },
        ]}
      />
      <AddProgram />
    </>
  );
}
