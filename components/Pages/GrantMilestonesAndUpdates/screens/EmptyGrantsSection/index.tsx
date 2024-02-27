/* eslint-disable @next/next/no-img-element */
import type { FC } from "react";
import { MESSAGES, PAGES } from "@/utilities";
import { useOwnerStore, useProjectStore } from "@/store";
import { useQueryState } from "nuqs";

export const EmptyGrantsSection: FC = () => {
  const isProjectAdmin = useProjectStore((state) => state.isProjectOwner);
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isAuthorized = isProjectAdmin || isOwner;
  const [, changeTab] = useQueryState("tab");
  if (!isAuthorized) {
    return (
      <div className="flex w-full items-center justify-center rounded border border-gray-200 px-6 py-10">
        <div className="flex max-w-[438px] flex-col items-center justify-center gap-6">
          <img
            src="/images/comments.png"
            alt=""
            className="h-[185px] w-[438px] object-cover"
          />
          <div className="flex w-full flex-col items-center justify-center gap-3">
            <p className="text-center text-lg font-semibold text-black dark:text-zinc-100 ">
              Welcome to the Grants section!
            </p>
            <p className="text-center text-base font-normal text-black dark:text-zinc-100 ">
              {MESSAGES.PROJECT.EMPTY.GRANTS.NOT_CREATED}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-1 flex-row max-lg:flex-col gap-6">
      <div
        className="flex h-96 border-spacing-4 flex-col items-center justify-center gap-5 rounded border border-blue-600 dark:bg-zinc-900 bg-[#EEF4FF] px-8"
        style={{
          border: "dashed 2px #155EEF",
        }}
      >
        <p className="w-full text-center text-lg break-words h-max font-semibold text-black dark:text-zinc-200">
          Go ahead and create your first grant
        </p>
        <button
          className="items-center flex flex-row justify-center gap-2 rounded border border-blue-600 bg-blue-600 px-4 py-2.5 text-base font-semibold text-white hover:bg-blue-600"
          onClick={() => {
            changeTab("create-grant");
          }}
        >
          <img src="/icons/plus.svg" alt="Add" className="relative h-5 w-5" />
          Add a Grant
        </button>
      </div>
      <div className="flex w-full items-center justify-center rounded border border-gray-200 px-6 py-10 dark:bg-zinc-900">
        <div className="flex max-w-[438px] flex-col items-center justify-center gap-6">
          <img
            src="/images/comments.png"
            alt=""
            className="h-[185px] w-[438px] object-cover"
          />
          <div className="flex w-full flex-col items-center justify-center gap-3">
            <p className="text-center text-lg font-semibold text-black dark:text-white">
              {`Milestones & updates space :)`}
            </p>
            <p className="text-center text-base font-normal text-black dark:text-white">
              {MESSAGES.PROJECT.EMPTY.GRANTS.NOT_CREATED_USER}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
