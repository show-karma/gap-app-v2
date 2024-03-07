import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useGap } from "@/hooks";
import { Community } from "@show-karma/karma-gap-sdk";
import { isCommunityAdminOf } from "@/utilities/sdk/communities/isCommunityAdmin";
import { useAccount } from "wagmi";
import { Spinner } from "@/components/Utilities/Spinner";
import { NextSeo } from "next-seo";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { zeroUID } from "@/utilities/commons";
import { PAGES } from "@/utilities/pages";
import { defaultMetadata } from "@/utilities/meta";
import { cn } from "@/utilities/tailwind";
import { MESSAGES } from "@/utilities/messages";
import { useAuthStore } from "@/store/auth";

export default function Index() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { isAuth } = useAuthStore();
  const communityId = router.query.communityId as string;
  const { gap } = useGap();

  // Call API
  const [loading, setLoading] = useState<boolean>(true); // Loading state of the API call
  const [community, setCommunity] = useState<Community | undefined>(undefined); // Data returned from the API
  const [isAdmin, setIsAdmin] = useState<boolean>(false); // Data returned from the API
  const signer = useSigner();

  useEffect(() => {
    const fetchDetails = async () => {
      if (!communityId || !gap) return;
      setLoading(true);
      try {
        const result = await (communityId.startsWith("0x")
          ? gap.fetch.communityById(communityId as `0x${string}`)
          : gap.fetch.communityBySlug(communityId));
        if (!result || result.uid === zeroUID)
          throw new Error("Community not found");
        setCommunity(result);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        if (
          error.message === "Community not found" ||
          error.message.includes("422")
        ) {
          router.push(PAGES.NOT_FOUND);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [communityId, gap]);

  useEffect(() => {
    if (!community) return;

    const checkIfAdmin = async () => {
      setLoading(true);
      if (!community?.uid || !isAuth) return;
      try {
        const checkAdmin = await isCommunityAdminOf(
          community,
          address as string,
          signer
        );
        setIsAdmin(checkAdmin);
      } catch (error) {
        console.log(error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkIfAdmin();
  }, [address, isConnected, isAuth, community?.uid, signer]);

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
        <div className="py-8 rounded-xl bg-black border border-primary-800 text-center flex flex-col gap-2 justify-center w-full items-center">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img
              src={community?.details?.imageURL}
              className={cn(
                "h-14 w-14 rounded-full",
                loading ? "animate-pulse bg-gray-600" : ""
              )}
            />
          </div>

          <div className="mt-3 text-3xl font-black text-white w-max flex flex-row gap-2">
            <span
              className={cn(
                loading
                  ? "animate-pulse min-w-32 bg-gray-600 rounded-lg px-4 py-0"
                  : ""
              )}
            >
              {community && !loading ? community.details?.name : ""}
            </span>{" "}
            Admin
          </div>
        </div>

        <div className="mt-12 flex gap-8 flex-row max-lg:flex-col-reverse w-full">
          {loading ? (
            <div className="flex w-full items-center justify-center">
              <Spinner />
            </div>
          ) : isAdmin ? (
            <div className="flex flex-row flex-wrap gap-8">
              <a
                href={PAGES.ADMIN.ASSIGN_QUESTIONS(
                  community?.details?.slug || communityId
                )}
              >
                <button className="px-10 py-8 bg-green-200 rounded-md  transition-all ease-in-out duration-200 dark:bg-green-900">
                  Assign questions
                </button>
              </a>
              <a
                href={PAGES.ADMIN.EDIT_CATEGORIES(
                  community?.details?.slug || communityId
                )}
              >
                <button className="px-10 py-8 bg-blue-200 rounded-md  transition-all ease-in-out duration-200 dark:bg-blue-900">
                  Edit categories
                </button>
              </a>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center">
              <p>{MESSAGES.ADMIN.NOT_AUTHORIZED}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
