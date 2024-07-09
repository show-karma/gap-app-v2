"use client";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { grantReviewDictionary } from "../GrantReviews/util";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { zeroUID } from "@/utilities/commons";
import { PAGES } from "@/utilities/pages";
import { Spinner } from "@/components/Utilities/Spinner";

export default function CommunityLanding() {
  const { get } = useSearchParams();
  const communityId = get("communityId");
  const [community, setCommunity] = useState<ICommunityResponse | undefined>(
    undefined
  ); // Data returned from the API
  const [loading, setLoading] = useState<boolean>(true); // Loading state of the API call
  const router = useRouter();

  if (communityId && !grantReviewDictionary[communityId]) {
    const slug = community?.details?.data?.slug;
    if (!slug || (slug && !grantReviewDictionary[slug])) {
    }
  }

  useEffect(() => {
    const fetchDetails = async () => {
      if (!communityId) return;
      setLoading(true);
      try {
        const { data: result } = await gapIndexerApi.communityBySlug(
          communityId
        );
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
  }, [communityId]);

  return (
    <div className="mb-8 flex flex-col items-center px-12 py-8  max-xl:px-12 max-md:px-4">
      {loading ? (
        <Spinner />
      ) : (
        grantReviewDictionary[
          (community?.details?.data?.slug || community?.uid) as string
        ]
      )}
    </div>
  );
}
