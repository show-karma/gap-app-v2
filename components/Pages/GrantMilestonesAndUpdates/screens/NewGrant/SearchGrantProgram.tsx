import React, { useEffect, useState } from "react";
import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { GrantTitleDropdown } from "./GrantTitleDropdown";

interface SearchGrantProgramProps {
  grantToEdit?: IGrantResponse;
  communityUID: string;
  chainId: number;
  setValue: (
    field: string,
    value: string | undefined,
    options?: {
      shouldValidate: boolean;
    }
  ) => void;
  watch: (field: string) => any;
}

export function SearchGrantProgram({
  grantToEdit,
  communityUID,
  chainId,
  setValue,
  watch,
}: SearchGrantProgramProps) {
  const [allPrograms, setAllPrograms] = useState<GrantProgram[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedProgram, setSelectedProgram] = useState<GrantProgram | null>(
    null
  );

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const [result, error] = await fetchData(
        INDEXER.COMMUNITY.PROGRAMS(communityUID)
      );
      if (error) {
        console.log(error);
      }
      const sortedAlphabetically = result.sort(
        (a: GrantProgram, b: GrantProgram) => {
          const aTitle = a.metadata?.title || "";
          const bTitle = b.metadata?.title || "";
          if (aTitle < bTitle) return -1;
          if (aTitle > bTitle) return 1;
          return 0;
        }
      );
      setAllPrograms(sortedAlphabetically);
      setIsLoading(false);
    })();
  }, [communityUID]);

  return (
    <div className="w-full max-w-[400px]">
      {isLoading ? (
        <div className="bg-zinc-100 p-3 text-sm ring-1 ring-zinc-200 rounded dark:bg-zinc-900">
          Loading Grants...
        </div>
      ) : !communityUID ? (
        <div className="bg-zinc-100 p-3 text-sm ring-1 ring-zinc-200 rounded dark:bg-zinc-900">
          Select a community to proceed
        </div>
      ) : (
        <GrantTitleDropdown
          chainId={chainId}
          list={allPrograms}
          setValue={setValue}
          setSelectedProgram={setSelectedProgram}
          type={"Grant"}
          grantToEdit={grantToEdit}
          selectedProgram={selectedProgram}
          prefixUnselected="Select"
          buttonClassname="w-full max-w-full"
          canAdd
        />
      )}
    </div>
  );
}
