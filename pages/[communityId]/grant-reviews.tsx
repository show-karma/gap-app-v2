import { grantReviewDictionary } from "@/components/Pages/GrantReviews/util";
import { Spinner } from "@/components/Utilities/Spinner";
import { zeroUID } from "@/utilities/commons";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { PAGES } from "@/utilities/pages";
import { getMetadata } from "@/utilities/sdk";
import type { ICommunityDetails } from "@show-karma/karma-gap-sdk";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Hex } from "viem";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { params } = context;
  const communityId = params?.communityId as string;
  const communityInfo = await getMetadata<ICommunityDetails>(
    "communities",
    communityId as Hex
  );
  if (communityInfo?.uid === zeroUID || !communityInfo) {
    return {
      notFound: true,
    };
  }
  return {
    props: {
      communityId,
    },
  };
}
function CommunityLanding({
  communityId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
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

export default CommunityLanding;
