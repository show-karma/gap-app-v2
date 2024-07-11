"use client";
import React, { useEffect, useState } from "react";
import { isCommunityAdminOf } from "@/utilities/sdk/communities/isCommunityAdmin";
import { useAccount } from "wagmi";
import { Spinner } from "@/components/Utilities/Spinner";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { MESSAGES } from "@/utilities/messages";
import { useAuthStore } from "@/store/auth";
import type { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

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
    <div className="px-4 sm:px-6 lg:px-12 py-5">
      <div className="py-8 rounded-xl bg-black border border-primary-800 text-center flex flex-col gap-2 justify-center w-full items-center">
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img
            src={community?.details?.data.imageURL}
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
            {community && !loading ? community.details?.data.name : ""}
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
                community?.details?.data.slug || communityId
              )}
            >
              <button className="px-10 py-8 bg-green-200 rounded-md  transition-all ease-in-out duration-200 dark:bg-green-900">
                Assign questions
              </button>
            </a>
            <a
              href={PAGES.ADMIN.EDIT_CATEGORIES(
                community?.details?.data.slug || communityId
              )}
            >
              <button className="px-10 py-8 bg-blue-200 rounded-md  transition-all ease-in-out duration-200 dark:bg-blue-900">
                Edit categories
              </button>
            </a>
          </div>
        ) : (
          <div className="flex w-full items-center justify-center">
            <p>{MESSAGES.ADMIN.NOT_AUTHORIZED(community?.uid || "")}</p>
          </div>
        )}
      </div>
    </div>
  );
};
