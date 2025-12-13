"use client";
import { useState } from "react";
import { GrantUpdateForm } from "@/components/Forms/GrantUpdate";
import { useProjectGrants } from "@/hooks/v2/useProjectGrants";
import { useProjectStore } from "@/store";
import { useProgressModalStore } from "@/store/modals/progress";
import type { GrantResponse } from "@/types/v2/grant";
import { Dropdown } from "./Dropdown";
import { NoGrant } from "./NoGrant";

export const GrantUpdateScreen = () => {
  const { project } = useProjectStore();
  const { closeProgressModal } = useProgressModalStore();
  const [selectedGrant, setSelectedGrant] = useState<GrantResponse | undefined>();

  // Fetch grants using dedicated hook
  const { grants } = useProjectGrants(project?.uid || "");
  if (!grants.length && project) {
    return <NoGrant />;
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <div className="text-sm font-bold text-black dark:text-zinc-100">Select Grant</div>
        <Dropdown
          list={grants.map((grant) => ({
            value: grant.details?.title || "",
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
