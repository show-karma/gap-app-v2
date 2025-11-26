"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useCommunityPrograms } from "@/hooks/usePrograms";

export function DonationProgramDropdown() {
  const params = useParams();
  const router = useRouter();
  const communityId = params.communityId as string;
  const programId = params.programId as string; // Format: programId_chainId

  const { data: programs, isLoading } = useCommunityPrograms(communityId);

  // Sort programs alphabetically by title
  const sortedPrograms = useMemo(() => {
    if (!programs) return [];
    return [...programs].sort((a, b) => {
      const aTitle = a.metadata?.title || "";
      const bTitle = b.metadata?.title || "";
      return aTitle.localeCompare(bTitle);
    });
  }, [programs]);

  const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCombinedId = e.target.value;
    if (selectedCombinedId) {
      router.push(`/community/${communityId}/donate/${selectedCombinedId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 text-sm animate-pulse h-[42px]" />
      </div>
    );
  }

  if (!programs || programs.length === 0) {
    return null;
  }

  // Don't show dropdown if there's only one program
  if (programs.length === 1) {
    return null;
  }

  return (
    <div className="w-full max-w-md">
      <label
        htmlFor="program-selector"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        Program
      </label>
      <select
        id="program-selector"
        className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-zinc-100 transition-colors text-sm"
        onChange={handleProgramChange}
        value={programId}
        aria-label="Select program"
      >
        {sortedPrograms.map((program) => {
          const combinedId =
            program.programId && program.chainID
              ? `${program.programId}_${program.chainID}`
              : program.programId || "";

          return (
            <option key={program.programId} value={combinedId}>
              {program.metadata?.title || "Untitled Program"}
            </option>
          );
        })}
      </select>
    </div>
  );
}
