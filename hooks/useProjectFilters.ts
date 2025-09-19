"use client";
import { useQueryState } from "nuqs";
import { SortByOptions, MaturityStageOptions } from "@/types";
import { useCallback } from "react";

interface UseProjectFiltersOptions {
  defaultSelectedCategories: string[];
  defaultSortBy: SortByOptions;
  defaultSelectedMaturityStage: MaturityStageOptions;
}

export function useProjectFilters({
  defaultSelectedCategories,
  defaultSortBy,
  defaultSelectedMaturityStage,
}: UseProjectFiltersOptions) {
  const [selectedCategories, setSelectedCategories] = useQueryState(
    "categories",
    {
      defaultValue: defaultSelectedCategories,
      serialize: (value) => value?.join(","),
      parse: (value) => (value ? value.split(",") : null),
    }
  );

  const [selectedSort, setSelectedSort] = useQueryState("sortBy", {
    defaultValue: defaultSortBy,
    serialize: (value) => value,
    parse: (value) =>
      value ? (value as SortByOptions) : ("milestones" as SortByOptions),
  });

  const [selectedMaturityStage, setSelectedMaturityStage] = useQueryState(
    "maturityStage",
    {
      defaultValue: defaultSelectedMaturityStage,
      serialize: (value) => value,
      parse: (value) =>
        value
          ? (value as MaturityStageOptions)
          : ("all" as MaturityStageOptions),
    }
  );

  const [selectedProgramId, setSelectedProgramId] = useQueryState<
    string | null
  >("programId", {
    defaultValue: null,
    serialize: (value) => value ?? "",
    parse: (value) => value || null,
  });

  const [selectedTrackIds, setSelectedTrackIds] = useQueryState<
    string[] | null
  >("trackIds", {
    defaultValue: null,
    serialize: (value) => value?.join(",") ?? "",
    parse: (value) => (value ? value.split(",") : null),
  });

  const changeCategories = useCallback(
    async (newValue: string[]) => {
      await setSelectedCategories(newValue);
    },
    [setSelectedCategories]
  );

  const changeSort = useCallback(
    async (newValue: SortByOptions) => {
      await setSelectedSort(newValue);
    },
    [setSelectedSort]
  );

  const changeMaturityStage = useCallback(
    async (newValue: MaturityStageOptions) => {
      await setSelectedMaturityStage(newValue);
    },
    [setSelectedMaturityStage]
  );

  const changeProgramId = useCallback(
    async (programId: string | null) => {
      await setSelectedProgramId(programId);
      // Reset track IDs when program changes
      await setSelectedTrackIds(null);
    },
    [setSelectedProgramId, setSelectedTrackIds]
  );

  const changeTrackIds = useCallback(
    async (trackIds: string[] | null) => {
      await setSelectedTrackIds(trackIds);
    },
    [setSelectedTrackIds]
  );

  return {
    // Current values
    selectedCategories,
    selectedSort,
    selectedMaturityStage,
    selectedProgramId,
    selectedTrackIds,

    // Change handlers
    changeCategories,
    changeSort,
    changeMaturityStage,
    changeProgramId,
    changeTrackIds,
  };
}