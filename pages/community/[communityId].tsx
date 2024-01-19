import React, { useEffect, useState } from "react";
import { CommunityFeed } from "@/components/Feed";
import CommunityGrants from "@/components/CommunityGrants";
import { useRouter } from "next/router";
import { useGap } from "@/hooks";
import { PAGES, zeroUID } from "@/utilities";
import { Community } from "@show-karma/karma-gap-sdk";

export default function Index() {
  const router = useRouter();
  const communityId = router.query.communityId as string;
  const { gap } = useGap();

  // Call API
  const [loading, setLoading] = useState<boolean>(true); // Loading state of the API call
  const [community, setCommunity] = useState<Community | undefined>(undefined); // Data returned from the API

  useEffect(() => {
    const fetchDetails = async () => {
      if (!communityId || !gap) return;
      setLoading(true);
      try {
        const result = await (communityId.startsWith("0x")
          ? gap.fetch.communityById(communityId as `0x${string}`)
          : gap.fetch.communityBySlug(communityId));
        console.log(result);
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

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 py-5">
        <div className="py-8 rounded-xl bg-black border border-primary-800 text-center">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img
              src={community?.details?.imageURL}
              className="h-14 w-14 rounded-full"
            />
          </div>
          <div className="mt-3 text-3xl font-black text-white">
            {community ? community.details?.name : ""} Community Grants
          </div>
        </div>

        <div className="mt-12 flex gap-x-8">
          <CommunityGrants />
          <CommunityFeed />
        </div>
      </div>
    </>
  );
}
