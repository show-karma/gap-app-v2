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
      <div className="flex flex-row flex-wrap gap-8">
        <a href={PAGES.ADMIN.COMMUNITIES}>
          <button className="px-10 py-8 bg-green-200 rounded-md  transition-all ease-in-out duration-200 dark:bg-green-900">
            Communities
          </button>
        </a>
        <a href={PAGES.ADMIN.COMMUNITY_STATS}>
          <button className="px-10 py-8 bg-blue-200 rounded-md  transition-all ease-in-out duration-200 dark:bg-blue-900">
            Community Stats
          </button>
        </a>
      </div>
    </div>
  );
};
