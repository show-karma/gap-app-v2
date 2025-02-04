"use client";
import { Spinner } from "@/components/Utilities/Spinner";
import { useAuthStore } from "@/store/auth";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { isCommunityAdminOf } from "@/utilities/sdk/communities/isCommunityAdmin";
import type { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { errorManager } from "@/components/Utilities/errorManager";

export const CommunityAdminPage = ({
  communityId,
  community,
}: {
  communityId: string;
  community: ICommunityResponse;
}) => {
  const { address, isConnected } = useAccount();
  const { isAuth } = useAuthStore();

  const [isAdmin, setIsAdmin] = useState<boolean>(false); // Data returned from the API
  const signer = useSigner();
  const [loading, setLoading] = useState<boolean>(false);

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
          `Error checking if ${address} is admin of ${communityId}`,
          error
        );
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkIfAdmin();
  }, [address, isConnected, isAuth, community?.uid, signer]);

  return (
    <div className="mt-4 flex gap-8 flex-row max-lg:flex-col-reverse w-full">
      {loading ? (
        <div className="flex w-full items-center justify-center">
          <Spinner />
        </div>
      ) : isAdmin ? (
        <div className="flex flex-row flex-wrap gap-8">
          <a
            href={PAGES.ADMIN.EDIT_CATEGORIES(
              community?.details?.data?.slug || communityId
            )}
          >
            <button className="px-10 py-8 bg-blue-200 rounded-md  transition-all ease-in-out duration-200 dark:bg-blue-900">
              Categories
            </button>
          </a>
          <a
            href={PAGES.ADMIN.MILESTONES(
              community?.details?.data?.slug || communityId
            )}
          >
            <button className="px-10 py-8 bg-yellow-200 rounded-md  transition-all ease-in-out duration-200 dark:bg-yellow-900">
              Milestones
            </button>
          </a>
          <a
            href={PAGES.ADMIN.MANAGE_INDICATORS(
              community?.details?.data?.slug || communityId
            )}
          >
            <button className="px-10 py-8 bg-red-200 rounded-md  transition-all ease-in-out duration-200 dark:bg-yellow-900">
              Impact Measurement
            </button>
          </a>
        </div>
      ) : (
        <div className="flex w-full items-center justify-center">
          <p>{MESSAGES.ADMIN.NOT_AUTHORIZED(community?.uid || "")}</p>
        </div>
      )}
    </div>
  );
};
