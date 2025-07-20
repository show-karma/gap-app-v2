"use client";
import { GrantUpdateForm } from "@/features/grants/components/forms/grant-update-form";
import { useProjectStore } from "@/features/projects/lib/store";
import { useProgressModalStore } from "@/features/modals/lib/stores/progress";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useState } from "react";
import { Dropdown } from "./Dropdown";
import { NoGrant } from "./NoGrant";

export const GrantUpdateScreen = () => {
  const { project } = useProjectStore();
  const { closeProgressModal } = useProgressModalStore();
  const [selectedGrant, setSelectedGrant] = useState<
    IGrantResponse | undefined
  >();
  const grants: IGrantResponse[] = project?.grants || [];
  if (!grants.length && project) {
    return <NoGrant />;
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-black dark:text-zinc-100">
          Select Grant
        </label>
        <Dropdown
          list={grants.map((grant) => ({
            value: grant.details?.data.title || "",
            id: grant.uid,
            timestamp: grant.createdAt,
          }))}
          onSelectFunction={(value: string) => {
            const newGrant = grants.find((grant) => grant.uid === value);
            setSelectedGrant(newGrant);
          }}
          type={"Grants"}
          selected={selectedGrant?.uid || ""}
        />
        {/* <select
          value={selectedGrant?.uid}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300"
        >
          <option
            value=""
            onClick={() => setSelectedGrant(undefined)}
            disabled
            className="text-gray-400"
          >
            Select Grant
          </option>
          {grants.map((grant) => (
            <option
              key={grant.uid}
              value={grant.uid}
              onClick={() => setSelectedGrant(grant)}
            >
              {grant.details?.data.title}
            </option>
          ))}
        </select> */}
      </div>
      <div className="flex flex-col gap-2">
        {selectedGrant ? (
          <GrantUpdateForm
            grant={selectedGrant}
            afterSubmit={() => {
              closeProgressModal();
            }}
          />
        ) : null}
      </div>
    </div>
  );
};
