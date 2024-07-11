"use client";
/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunitiesStore } from "@/store/communities";
import { PAGES } from "@/utilities/pages";
import { MESSAGES } from "@/utilities/messages";

export const CommunitiesToAdmin = () => {
  const { communities: communitiesToAdmin, isLoading } = useCommunitiesStore();

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-5">
      <div className="text-2xl font-bold">Communities to review</div>
      <div className="mt-5 grid grid-cols-4 gap-5">
        {communitiesToAdmin.length ? (
          communitiesToAdmin.map((community) => (
            <Link
              href={PAGES.ADMIN.ROOT(community.details?.slug || community.uid)}
              key={community.uid + community.details?.name}
            >
              <div className="flex w-full flex-col items-center justify-center rounded-lg p-4">
                <img
                  src={community.details?.imageURL}
                  className="h-[100px] w-full object-cover"
                  alt={community.details?.name}
                />
                <p className="text-base font-normal text-black dark:text-white">
                  {community.details?.name}
                </p>
              </div>
            </Link>
          ))
        ) : isLoading ? (
          <Spinner />
        ) : (
          <p>{MESSAGES.REVIEWS.NOT_ADMIN}</p>
        )}
      </div>
    </div>
  );
};
