"use client";
import { GrantUpdateForm } from "@/components/Forms/GrantUpdate";
import { useProjectStore } from "@/store";
import { useProgressModalStore } from "@/store/modals/progress";
import { PAGES } from "@/utilities/pages";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const GrantUpdateScreen = () => {
  const { project } = useProjectStore();
  const hasGrants = project?.grants && project?.grants?.length > 0;
  const router = useRouter();
  const { closeProgressModal } = useProgressModalStore();
  const [selectedGrant, setSelectedGrant] = useState<
    IGrantResponse | undefined
  >();
  if (!hasGrants && project) {
    return (
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
          type="button"
          className="items-center flex flex-row justify-center gap-2 rounded border border-blue-600 bg-blue-600 px-4 py-2.5 text-base font-semibold text-white hover:bg-blue-600"
          //   onClick={() => {
          //     changeTab("create-grant");
          //   }}
          onClick={() => {
            router.push(
              PAGES.PROJECT.TABS.SELECTED_TAB(
                project.details?.data.slug || project.uid,
                "create-grant"
              )
            );
            closeProgressModal();
          }}
        >
          <img src="/icons/plus.svg" alt="Add" className="relative h-5 w-5" />
          Add a Grant
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {selectedGrant ? <GrantUpdateForm grant={selectedGrant} /> : null}
    </div>
  );
};
