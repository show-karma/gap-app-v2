import React from "react";
import Link from "next/link";
import { NextSeo } from "next-seo";
import { defaultMetadata } from "@/utilities";

const NotFoundPage: React.FC = () => {
  return (
    <>
      <NextSeo
        title={defaultMetadata.title}
        description={defaultMetadata.description}
        twitter={{
          handle: defaultMetadata.twitter.creator,
          site: defaultMetadata.twitter.site,
          cardType: "summary_large_image",
        }}
        openGraph={{
          url: defaultMetadata.openGraph.url,
          title: defaultMetadata.title,
          description: defaultMetadata.description,
          images: defaultMetadata.openGraph.images.map((image) => ({
            url: image,
            alt: defaultMetadata.title,
          })),
          site_name: defaultMetadata.openGraph.siteName,
        }}
        additionalLinkTags={[
          {
            rel: "icon",
            href: "/favicon.png",
          },
        ]}
      />
      <div className="col-span-12 min-h-screen px-4 py-4">
        <h1 className="text-3xl mb-5">404 - Page Not Found</h1>
        <Link href="/">Go Home</Link>
      </div>
    </>
  );
};

export default NotFoundPage;
