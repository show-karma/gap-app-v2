"use client";
import { useProjectStore } from "@/features/projects/lib/store";
import { useProgressModalStore } from "@/features/modals/lib/stores/progress";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useState } from "react";
import { Dropdown } from "./Dropdown";
import { NoGrant } from "./NoGrant";
import { MilestoneForm } from "@/features/milestones/components/forms/milestone-form";

export const MilestoneScreen = () => {
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
      </div>
      <div className="flex flex-col gap-2">
        {selectedGrant ? (
          <MilestoneForm
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
