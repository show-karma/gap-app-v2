/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { Spinner } from "@/components/Utilities/Spinner";
import { NextSeo } from "next-seo";
import { useCommunitiesStore } from "@/store/communities";
import { defaultMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";
import { MESSAGES } from "@/utilities/messages";
import { Community } from "@show-karma/karma-gap-sdk";
import { useGap } from "@/hooks";
import toast from "react-hot-toast";
import { shortAddress } from "@/utilities/shortAddress";
import { ClipboardDocumentIcon } from "@heroicons/react/20/solid";
import { Button } from "@/components/Utilities/Button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { blo } from "blo";

export default function Communities() {
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedText, copy] = useCopyToClipboard();

  const { gap } = useGap();
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        if (!gap) throw new Error("Gap not initialized");
        setIsLoading(true);
        const result = await gap.fetch.communities();
        result.sort((a, b) =>
          (a.details?.name || a.uid).localeCompare(b.details?.name || b.uid)
        );
        setAllCommunities(result);
        return result;
      } catch (error) {
        console.log(error);
        setAllCommunities([]);
        return undefined;
      } finally {
        setIsLoading(false);
      }
    };
    fetchCommunities();
  }, []);

  const handleCopy = (text: string) => {
    copy(text)
      .then(() => {
        toast.success(`Copied ${shortAddress(text)} to clipboard!`);
      })
      .catch((error) => {
        toast.error(`Failed to copy! ${error}`);
      });
  };

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
            href: "/images/favicon.png",
          },
        ]}
      />

      <div className="px-4 sm:px-6 lg:px-12 py-5">
        <div className="text-2xl font-bold">
          All Communities{" "}
          {allCommunities.length ? `(${allCommunities.length})` : ""}
        </div>
        <div className="mt-5 grid grid-cols-4 gap-5">
          {allCommunities.length ? (
            allCommunities.map((community) => (
              <div
                key={community.uid + community.details?.name}
                className="flex w-full flex-col items-center justify-center rounded-lg p-4"
              >
                <Link
                  href={PAGES.ADMIN.ROOT(
                    community.details?.slug || community.uid
                  )}
                >
                  <img
                    src={community.details?.imageURL || blo(community.uid)}
                    className="h-[100px] w-full object-cover mb-2"
                    alt={""}
                  />
                </Link>
                <p className="text-lg font-normal text-black dark:text-white font-semibold">
                  {community.details?.name ? community.details?.name : null}
                </p>
                <div className="flex flex-row gap-2 items-center">
                  <p className="text-sm font-normal text-black dark:text-white w-full break-all">
                    ({community.uid})
                  </p>
                  <Button
                    className="p-1 bg-transparent flex flex-col gap-2 hover:bg-transparent dark:hover:bg-transparent text-base font-normal text-black dark:text-white"
                    onClick={() => {
                      handleCopy(community.uid);
                    }}
                  >
                    <ClipboardDocumentIcon className="h-5 w-5 text-black dark:text-white" />
                  </Button>
                </div>
              </div>
            ))
          ) : isLoading ? (
            <Spinner />
          ) : null}
        </div>
      </div>
    </>
  );
}
