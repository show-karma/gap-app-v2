/* eslint-disable @next/next/no-img-element */
import type { FC } from "react";

import Link from "next/link";
import { MESSAGES, PAGES } from "@/utilities";
import { useProjectStore } from "@/store";

export const EmptyGrantsSection: FC = () => {
  const isProjectAdmin = useProjectStore((state) => state.isProjectOwner);
  const project = useProjectStore((state) => state.project);
  if (!isProjectAdmin) {
    return (
      <div className="flex w-full items-center justify-center rounded border border-gray-200 px-6 py-10">
        <div className="flex max-w-[438px] flex-col items-center justify-center gap-6">
          <img
            src="/images/comments.png"
            alt=""
            className="h-[185px] w-[438px] object-cover"
          />
          <div className="flex w-full flex-col items-center justify-center gap-3">
            <p className="text-center text-lg font-semibold text-black ">
              Welcome to the Grants section!
            </p>
            <p className="text-center text-base font-normal text-black ">
              {MESSAGES.PROJECT.EMPTY.GRANTS.NOT_CREATED}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-1 flex-row gap-6">
      <div
        className="flex h-96 border-spacing-4 flex-col items-center justify-center gap-5 rounded border border-blue-600 bg-[#EEF4FF] px-8"
        style={{
          border: "dashed 2px #155EEF",
        }}
      >
        <p className="w-max text-center text-lg font-semibold text-black">
          Go ahead and create your first grant
        </p>
        <Link
          className="items-center flex flex-row justify-center gap-2 rounded border border-blue-600 bg-blue-600 px-4 py-2.5 text-base font-semibold text-white hover:bg-blue-600"
          href={PAGES.PROJECT.TABS.SELECTED_TAB(
            project?.uid || "",
            undefined,
            "create-grant"
          )}
        >
          <img src="/icons/plus.svg" alt="Add" className="relative h-5 w-5" />
          Add a Grant
        </Link>
      </div>
      <div className="flex w-full items-center justify-center rounded border border-gray-200 px-6 py-10">
        <div className="flex max-w-[438px] flex-col items-center justify-center gap-6">
          <img
            src="/images/comments.png"
            alt=""
            className="h-[185px] w-[438px] object-cover"
          />
          <div className="flex w-full flex-col items-center justify-center gap-3">
            <p className="text-center text-lg font-semibold text-black ">
              {`Milestones & updates space :)`}
            </p>
            <p className="text-center text-base font-normal text-black ">
              {MESSAGES.PROJECT.EMPTY.GRANTS.NOT_CREATED_USER}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
