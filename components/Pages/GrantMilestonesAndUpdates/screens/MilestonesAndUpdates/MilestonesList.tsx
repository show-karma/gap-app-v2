import pluralize from "pluralize";
import { type FC, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import type { Grant } from "@/types/v2/grant";
import { normalizeTimestamp } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import { GrantUpdate } from "./GrantUpdate";
import { MilestoneDetails } from "./MilestoneDetails";

interface MilestonesListProps {
  grant: Grant;
}

type Tab = "completed" | "pending" | "all";

interface TabButtonProps {
  handleSelection: (text: Tab) => void;
  tab: Tab;
  selectedType: Tab;
  tabName: string;
  length: number;
}

const TabButton: FC<TabButtonProps> = ({ handleSelection, tab, tabName, selectedType, length }) => {
  const isSelected = selectedType === tab;
  return (
    <Button
      className={cn(
        "flex flex-row my-0.5 items-center gap-2 bg-transparent px-2 py-1 font-medium text-black hover:bg-white hover:text-black max-sm:text-sm",
        isSelected ? "text-black bg-white dark:bg-zinc-600 dark:text-white" : "text-gray-500"
      )}
      onClick={() => {
        handleSelection(tab);
      }}
    >
      {tabName}
      <p
        className="rounded-full px-2.5"
        style={{
          background: isSelected ? "#F2F4F7" : "",
          color: isSelected ? "#155EEF" : "#667085",
        }}
      >
        {length}
      </p>
    </Button>
  );
};

export const MilestonesList: FC<MilestonesListProps> = ({ grant }) => {
  const { milestones, updates } = grant;

  const [selectedMilestoneType, setSelectedMilestoneType] = useState<Tab>("completed");

  // Initialize selection from hash on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash.replace("#", "") as Tab;
    if (hash && ["completed", "pending", "all"].includes(hash)) {
      setSelectedMilestoneType(hash);
    }
  }, []);

  // Helper to get timestamp in milliseconds from various date formats
  const getTimestampMs = (value: any): number => {
    if (!value) return 0;
    // If it's a number (Unix timestamp), normalize it
    if (typeof value === "number") return normalizeTimestamp(value);
    // If it's a string or Date, parse it
    return new Date(value).getTime();
  };

  // Compute merged and ordered array from props (no state needed)
  const generalArray = useMemo(() => {
    const merged: any[] = [];

    updates?.forEach((update) => {
      merged.push({
        object: update,
        date: getTimestampMs(update.createdAt),
        type: "update",
      });
    });

    milestones?.forEach((milestone) => {
      merged.push({
        object: milestone,
        date: milestone.endsAt
          ? getTimestampMs(milestone.endsAt)
          : getTimestampMs(milestone.createdAt),
        type: "milestone",
      });
    });

    // Sort descending by date (newest first)
    return merged.sort((a, b) => b.date - a.date);
  }, [updates, milestones]);

  // Helper to properly check if a milestone is completed
  // API may return empty array [] which is truthy in JS but means not completed
  const isCompleted = (item: any): boolean => {
    if (item.type === "update") return true; // Updates are always "completed"
    const completed = item.object.completed;
    if (Array.isArray(completed)) return completed.length > 0;
    return !!completed;
  };

  // Compute sorted milestone arrays (derived from generalArray)
  const { completedMilestones, pendingMilestones, allMilestones } = useMemo(() => {
    const unsortedCompleted = generalArray.filter((item) => isCompleted(item));
    const unsortedPending = generalArray.filter(
      (item) => !isCompleted(item) && item.type !== "update"
    );

    // For completed items: use completion date or creation date, descending (newest first)
    const getCompletedDate = (item: any): number => {
      if (item.type === "update") return getTimestampMs(item.object.createdAt);
      // Check for completion with proper array handling
      const completed = item.object.completed;
      if (completed && !Array.isArray(completed) && completed.createdAt) {
        return getTimestampMs(completed.createdAt);
      }
      if (Array.isArray(completed) && completed.length > 0 && completed[0]?.createdAt) {
        return getTimestampMs(completed[0].createdAt);
      }
      return item.date; // fallback to pre-computed date
    };

    // For pending items: use due date (endsAt), ascending (soonest due first)
    const getPendingDate = (item: any): number => {
      if (item.object.data?.endsAt) {
        return getTimestampMs(item.object.data.endsAt);
      }
      return item.date; // fallback to pre-computed date
    };

    // For all items: use appropriate date based on status, descending (newest first)
    const getAllDate = (item: any): number => {
      if (item.type === "update") return getTimestampMs(item.object.createdAt);
      // Check for completion with proper array handling
      const completed = item.object.completed;
      if (completed && !Array.isArray(completed) && completed.createdAt) {
        return getTimestampMs(completed.createdAt);
      }
      if (Array.isArray(completed) && completed.length > 0 && completed[0]?.createdAt) {
        return getTimestampMs(completed[0].createdAt);
      }
      return item.date; // fallback to pre-computed date (endsAt or createdAt)
    };

    return {
      // Completed: descending by completion/creation date (newest first)
      completedMilestones: [...unsortedCompleted].sort(
        (a, b) => getCompletedDate(b) - getCompletedDate(a)
      ),
      // Pending: ascending by due date (soonest first)
      pendingMilestones: [...unsortedPending].sort((a, b) => getPendingDate(a) - getPendingDate(b)),
      // All: descending by date (newest first)
      allMilestones: [...generalArray].sort((a, b) => getAllDate(b) - getAllDate(a)),
    };
  }, [generalArray]);

  // Derive selected tab array directly (no state needed)
  const selectedTabArray = useMemo(() => {
    const tabArrays = {
      completed: completedMilestones,
      pending: pendingMilestones,
      all: allMilestones,
    };
    return tabArrays[selectedMilestoneType];
  }, [selectedMilestoneType, completedMilestones, pendingMilestones, allMilestones]);

  const handleSelection = (text: Tab) => {
    setSelectedMilestoneType(text);
    if (typeof window !== "undefined") {
      window.location.hash = text;
    }
  };

  // Count completed milestones properly (handling array format)
  const completedMilestonesCount = (milestones || []).filter((i) => {
    const completed = i.completed;
    if (Array.isArray(completed)) return completed.length > 0;
    return !!completed;
  }).length;
  const updatesLength = completedMilestonesCount + (updates?.length || 0);
  const milestonesCounter = milestones?.length || 0;

  return (
    <div className="flex flex-col gap-2" id="milestones-and-updates-list">
      <div className="flex flex-col gap-3">
        <div className=" flex flex-col items-start justify-start gap-0 ">
          <div className="flex w-full flex-row flex-wrap items-center justify-between gap-4 py-3">
            <div className="flex w-max flex-row flex-wrap items-center  gap-4 max-sm:flex-col max-sm:items-start max-sm:justify-start">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-200">MILESTONES</p>
              <div className="flex flex-row flex-wrap gap-2 rounded bg-[#F2F4F7] dark:bg-zinc-800 px-2 py-1">
                <TabButton
                  handleSelection={() => handleSelection("completed")}
                  tab="completed"
                  tabName="Completed"
                  selectedType={selectedMilestoneType}
                  length={completedMilestones.length}
                />
                <TabButton
                  handleSelection={() => handleSelection("pending")}
                  tab="pending"
                  tabName="Pending"
                  selectedType={selectedMilestoneType}
                  length={pendingMilestones.length}
                />
                <TabButton
                  handleSelection={() => handleSelection("all")}
                  tab="all"
                  tabName="All"
                  selectedType={selectedMilestoneType}
                  length={allMilestones.length}
                />
              </div>
            </div>
            <div className="flex flex-row flex-wrap gap-5">
              <p className="text-base font-normal text-gray-500 max-sm:text-sm">
                {milestonesCounter} {pluralize("Milestone", milestonesCounter)}, {updatesLength}{" "}
                {pluralize("update", updatesLength)} in this grant
              </p>
            </div>
          </div>

          <div className="mt-3 flex w-full flex-col gap-6">
            {selectedTabArray.map((item) => {
              if (item.type === "update") {
                const updatesArray = generalArray.filter((i) => i.type === "update");
                const updatesIndex = updatesArray.findIndex(
                  (i) =>
                    // eslint-disable-next-line no-underscore-dangle
                    (i?.object._uid || i.object.uid) ===
                    // eslint-disable-next-line no-underscore-dangle
                    (item?.object._uid || item.object.uid)
                );
                return (
                  <GrantUpdate
                    key={item.object.uid}
                    index={updatesArray.length - updatesIndex}
                    title={item.object?.title}
                    description={item.object?.text}
                    date={item.object.createdAt}
                    update={item.object}
                  />
                );
              }

              const milestoneArray = generalArray.filter((i) => i.type === "milestone");
              const mIndex = milestoneArray.findIndex(
                (i) =>
                  // eslint-disable-next-line no-underscore-dangle
                  (i?.object._uid || i.object.uid) ===
                  // eslint-disable-next-line no-underscore-dangle
                  (item?.object._uid || item.object.uid)
              );
              return (
                <MilestoneDetails
                  key={item.object.uid}
                  milestone={item.object}
                  index={milestoneArray.length - mIndex}
                />
              );
            })}
            {!selectedTabArray.length && (
              <div className="flex h-max w-full items-center justify-center">
                <p className="font-semibold text-black dark:text-white">
                  There are no {selectedMilestoneType} milestones.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
