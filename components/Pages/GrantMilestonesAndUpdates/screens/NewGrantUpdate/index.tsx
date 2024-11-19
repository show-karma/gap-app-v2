"use client";
/* eslint-disable @next/next/no-img-element */
import { GrantUpdateForm } from "@/components/Forms/GrantUpdate";
import { useProjectStore } from "@/store";
import { PAGES } from "@/utilities/pages";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import Image from "next/image";
import Link from "next/link";
import type { FC } from "react";

interface NewGrantUpdateProps {
  grant: IGrantResponse;
}

export const NewGrantUpdate: FC<NewGrantUpdateProps> = ({ grant }) => {
  const project = useProjectStore((state) => state.project);

  return (
    <div className="flex flex-1">
      <div className="flex w-full max-w-3xl flex-col gap-6 rounded-md bg-gray-200 dark:bg-zinc-900  px-4 py-6 max-lg:max-w-full">
        <div className="flex w-full flex-row justify-between">
          <h4 className="text-2xl font-bold text-black dark:text-zinc-100">
            Post a grant update
          </h4>
          <Link
            href={PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
              project?.details?.data?.slug || project?.uid || "",
              grant.uid,
              "milestones-and-updates"
            )}
            className="bg-transparent p-4 hover:bg-transparent hover:opacity-75"
          >
            <Image src="/icons/close.svg" alt="Close" width={20} height={20} />
          </Link>
        </div>
        <GrantUpdateForm grant={grant} />
      </div>
    </div>
  );
};
