import type { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import pluralize from "pluralize";
import { type FC, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { cn } from "@/utilities/tailwind";
import { GrantUpdate } from "./GrantUpdate";
import { MilestoneDetails } from "./MilestoneDetails";

interface MilestonesListProps {
  grant: IGrantResponse;
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

  // Compute merged and ordered array from props (no state needed)
  const generalArray = useMemo(() => {
    const merged: any[] = [];

    updates?.forEach((update) => {
      merged.push({
        object: update,
        date: new Date(update.createdAt).getTime() / 1000,
        type: "update",
      });
    });

    milestones?.forEach((milestone) => {
      merged.push({
        object: milestone,
        date: milestone.data.endsAt || milestone.createdAt,
        type: "milestone",
      });
    });

    return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [updates, milestones]);

  // Compute sorted milestone arrays (derived from generalArray)
  const { completedMilestones, pendingMilestones, allMilestones } = useMemo(() => {
    const unsortedCompleted = generalArray.filter(
      (item) => item.object.completed || item.type === "update"
    );
    const unsortedPending = generalArray.filter(
      (item) => !item.object.completed && item.type !== "update"
    );

    const getCompletedDate = (item: any) => {
      if (item.type === "update") return new Date(item.object.createdAt).getTime();
      if (item.object.completed) return new Date(item.object.completed.createdAt).getTime();
      return new Date(item.object.endsAt).getTime() || new Date(item.object.createdAt).getTime();
    };

    const getPendingDate = (item: any) => {
      return new Date(item.object.endsAt).getTime() || new Date(item.object.createdAt).getTime();
    };

    const getAllDate = (item: any) => {
      if (item.type === "update") return new Date(item.object.createdAt).getTime() / 1000;
      if (item.object.completed) return new Date(item.object.completed.createdAt).getTime() / 1000;
      return new Date(item.object.endsAt).getTime() || new Date(item.object.createdAt).getTime();
    };

    return {
      completedMilestones: [...unsortedCompleted].sort(
        (a, b) => getCompletedDate(b) - getCompletedDate(a)
      ),
      pendingMilestones: [...unsortedPending].sort((a, b) => getPendingDate(a) - getPendingDate(b)),
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

  const updatesLength = milestones.filter((i) => i.completed).length + updates.length;
  const milestonesCounter = milestones.length;

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
                    title={item.object?.data?.title}
                    description={item.object?.data?.text}
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
