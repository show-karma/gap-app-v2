"use client";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { grantReviewDictionary } from "../GrantReviews/util";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { zeroUID } from "@/utilities/commons";
import { PAGES } from "@/utilities/pages";
import { Spinner } from "@/components/Utilities/Spinner";

interface CommunityLandingProps {
  community: ICommunityResponse;
}

export default function CommunityLanding({ community }: CommunityLandingProps) {
  return (
    <div className="mb-8 flex flex-col items-center px-12 py-8  max-xl:px-12 max-md:px-4">
      {
        grantReviewDictionary[
          (community?.details?.data?.slug || community?.uid) as string
        ]
      }
    </div>
  );
}
