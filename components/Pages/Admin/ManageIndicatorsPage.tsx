"use client";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { zeroUID } from "@/utilities/commons";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { defaultMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";
import { isCommunityAdminOf } from "@/utilities/sdk/communities/isCommunityAdmin";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { IndicatorsHub } from "@/components/Pages/Admin/IndicatorsHub";
import { ManageCategoriesOutputs } from "@/components/Pages/Admin/ManageCategoriesOutputs";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAuthStore } from "@/store/auth";
import { Category } from "@/types/impactMeasurement";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

export const metadata = defaultMetadata;

export default function ManageIndicatorsPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { isAuth } = useAuthStore();
  const params = useParams();
  const communityId = params.communityId as string;
  // Call API
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState<boolean>(true); // Loading state of the API call
  const [community, setCommunity] = useState<ICommunityResponse | undefined>(
    undefined
  ); // Data returned from the API
  const [isAdmin, setIsAdmin] = useState<boolean>(false); // Data returned from the API
  const signer = useSigner();

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
        errorManager(`Error fetching community ${communityId}`, error, {
          community: communityId,
        });
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
      } catch (error: any) {
        errorManager(
          `Error checking if ${address} is admin of community ${communityId}`,
          error,
          {
            community: communityId,
            address: address,
          }
        );
        console.log(error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkIfAdmin();
  }, [address, isConnected, isAuth, community?.uid, signer]);

  const getCategories = async (isSilent: boolean = false) => {
    if (!isSilent) {
      setLoading(true);
    }

    try {
      const [data] = await fetchData(
        INDEXER.COMMUNITY.CATEGORIES(
          (community?.details?.data?.slug || community?.uid) as string
        )
      );
      if (data) {
        const categoriesWithoutOutputs = data.map((category: Category) => {
          const outputsNotDuplicated = category.outputs?.filter(
            (output) =>
              !category.impact_segments?.some(
                (segment) =>
                  segment.id === output.id || segment.name === output.name
              )
          );
          return {
            ...category,
            impact_segments: [
              ...(category.impact_segments || []),
              ...(outputsNotDuplicated || []).map((output: any) => {
                return {
                  id: output.id,
                  name: output.name,
                  description: output.description,
                  impact_indicators: [],
                  type: output.type,
                };
              }),
            ],
          };
        });
        return categoriesWithoutOutputs;
      }
    } catch (error: any) {
      errorManager(
        `Error fetching categories of community ${communityId}`,
        error,
        {
          community: communityId,
        }
      );
      console.error(error);
      return [];
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  useMemo(() => {
    if (community?.uid) {
      setLoading(true);
      getCategories()
        .then((res) => {
          setCategories(res);
        })
        .catch(() => {
          setCategories([]);
        });
    }
  }, [community?.uid]);

  return (
    <div className="mt-4 flex gap-8 flex-row max-lg:flex-col-reverse w-full">
      {loading ? (
        <div className="flex w-full items-center justify-center">
          <Spinner />
        </div>
      ) : isAdmin ? (
        <div className="flex w-full flex-1 flex-col items-center gap-8 ">
          <div className="w-full flex flex-row items-center justify-between  max-w-7xl">
            <Link
              href={PAGES.ADMIN.ROOT(
                community?.details?.data?.slug || (community?.uid as string)
              )}
            >
              <Button className="flex flex-row items-center gap-2 px-4 py-2 bg-transparent text-black dark:text-white dark:bg-transparent hover:bg-transparent rounded-md transition-all ease-in-out duration-200">
                <ChevronLeftIcon className="h-5 w-5" />
                Return to admin page
              </Button>
            </Link>
          </div>

          <div className="flex flex-row w-full max-md:flex-col gap-8 max-md:gap-4  max-w-7xl">
            <div className="flex-1 flex gap-8">
              <div className="bg-gray-50 dark:bg-zinc-900 rounded-lg p-8  h-max max-h-full w-full">
                <h2 className="text-2xl font-bold mb-6">Manage Indicators</h2>
                <IndicatorsHub communityId={community?.uid as string} />
              </div>
            </div>

            <div className="flex-1 flex gap-8">
              <ManageCategoriesOutputs
                categories={categories}
                setCategories={setCategories}
                community={community}
                refreshCategories={getCategories}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex w-full items-center justify-center">
          <p>{MESSAGES.ADMIN.NOT_AUTHORIZED(community?.uid || "")}</p>
        </div>
      )}
    </div>
  );
}
