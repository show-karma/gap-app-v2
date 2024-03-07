import type { Grant } from "@show-karma/karma-gap-sdk/core/class/entities/Grant";
import pluralize from "pluralize";
import { type FC, useEffect, useMemo, useState, use } from "react";

import { useGap } from "@/hooks/useGap";
import { Button } from "@/components/Utilities/Button";
import { useAccount, useNetwork } from "wagmi";
import { GrantUpdate } from "./GrantUpdate";
import { MilestoneDetails } from "./MilestoneDetails";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { isCommunityAdminOf } from "@/utilities/sdk";
import { cn } from "@/utilities/tailwind";

interface MilestonesListProps {
  grant: Grant;
}

type Tab = "completed" | "pending" | "all";

interface TabButtonProps {
  handleSelection: (text: Tab) => void;
  tab: Tab;
  selectedType?: Tab;
  tabName: string;
  length: number;
}

const TabButton: FC<TabButtonProps> = ({
  handleSelection,
  tab,
  tabName,
  selectedType,
  length,
}) => {
  const isSelected = selectedType === tab;
  return (
    <Button
      className={cn(
        "flex flex-row my-0.5 items-center gap-2 bg-transparent px-2 py-1 font-medium text-black hover:bg-white hover:text-black max-sm:text-sm",
        isSelected
          ? "text-black bg-white dark:bg-zinc-600 dark:text-white"
          : "text-gray-500"
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
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { gap } = useGap();
  const { milestones } = grant;
  const { updates } = grant;

  const [generalArray, setGeneralArray] = useState([] as any[]);
  const [selectedTabArray, setSelectedTabArray] = useState([] as any[]);
  const [pendingMilestones, setPendingMilestones] = useState([] as any[]);
  const [completedMilestones, setCompletedMilestones] = useState([] as any[]);
  const [allMilestones, setAllMilestones] = useState([] as any[]);

  const [selectedMilestoneType, setSelectedMilestoneType] = useState<
    Tab | undefined
  >(undefined);

  const [isCommunityAdmin, setIsCommunityAdmin] = useState(false);

  const signer = useSigner();

  const checkIfAdmin = async () => {
    if (!chain?.id || !gap) return;
    try {
      const community = await gap.fetch.communityById(grant.communityUID);
      const result = await isCommunityAdminOf(
        community,
        address as string,
        signer
      );
      setIsCommunityAdmin(result);
    } catch (error) {
      console.log(error);
      setIsCommunityAdmin(false);
    }
  };

  useEffect(() => {
    checkIfAdmin();
  }, [address, grant.uid, signer]);

  const getOrderedMerge = () => {
    const merged: any[] = [];

    if (updates) {
      updates.forEach((update) => {
        merged.push({
          object: update,
          date: new Date(update.createdAt).getTime() / 1000,
          type: "update",
        });
      });
    }
    if (milestones) {
      grant.milestones?.forEach((milestone) => {
        merged.push({
          object: milestone,
          date: milestone.endsAt || milestone.createdAt,
          type: "milestone",
        });
      });
    }

    const ordered = merged.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    setGeneralArray(ordered);
    return ordered;
  };

  useEffect(() => {
    getOrderedMerge();
  }, [updates, milestones, grant.uid]);

  const getUnsortedMilestones = () => {
    const unsortedCompletedMilestones = generalArray.filter((item) => {
      return item.object.completed || item.type === "update";
    });

    const unsortedPendingMilestones = generalArray.filter(
      (item) => !item.object.completed && item.type !== "update"
    );

    const unsortedAllMilestones = [...generalArray];
    return {
      unsortedCompletedMilestones,
      unsortedPendingMilestones,
      unsortedAllMilestones,
    };
  };

  const rearrangeArrayByType = () => {
    const {
      unsortedCompletedMilestones,
      unsortedPendingMilestones,
      unsortedAllMilestones,
    } = getUnsortedMilestones();

    const completedMilestonesToSet = unsortedCompletedMilestones.sort(
      (a, b) => {
        const getDate = (item: any) => {
          if (item.type === "update") {
            return new Date(item.object.createdAt).getTime();
          }
          if (item.object.completed)
            return new Date(item.object.completed.createdAt).getTime();
          return (
            new Date(item.object.endsAt).getTime() ||
            new Date(item.object.createdAt).getTime()
          );
        };
        const bDate = getDate(b);
        const aDate = getDate(a);
        return bDate - aDate;
      }
    );

    const pendingMilestonesToSet = unsortedPendingMilestones.sort((a, b) => {
      const getDate = (item: any) => {
        return (
          new Date(item.object.endsAt).getTime() ||
          new Date(item.object.createdAt).getTime()
        );
      };
      const bDate = getDate(b);
      const aDate = getDate(a);
      return aDate - bDate;
    });

    const allMilestonesToSet = unsortedAllMilestones.sort((a, b) => {
      const getDate = (item: any) => {
        if (item.type === "update") {
          return new Date(item.object.createdAt).getTime() / 1000;
        }
        if (item.object.completed) {
          return new Date(item.object.completed.createdAt).getTime() / 1000;
        }
        return (
          new Date(item.object.endsAt).getTime() ||
          new Date(item.object.createdAt).getTime()
        );
      };
      const bDate = getDate(b);
      const aDate = getDate(a);
      return bDate - aDate;
    });

    setPendingMilestones(pendingMilestonesToSet);
    setCompletedMilestones(completedMilestonesToSet);
    setAllMilestones(allMilestonesToSet);

    const setDictionary = {
      completed: completedMilestonesToSet,
      pending: pendingMilestonesToSet,
      all: allMilestonesToSet,
    };

    const ordered = selectedMilestoneType
      ? setDictionary[selectedMilestoneType]
      : [];

    setSelectedTabArray(ordered);
  };

  const handleSelection = (text: Tab) => {
    setSelectedMilestoneType(text);
  };

  useEffect(() => {
    const { unsortedCompletedMilestones, unsortedPendingMilestones } =
      getUnsortedMilestones();

    if (
      unsortedPendingMilestones.length &&
      !unsortedCompletedMilestones.length
    ) {
      handleSelection("pending");
    } else {
      handleSelection("completed");
    }
  }, [grant.uid, generalArray]);

  useMemo(() => {
    rearrangeArrayByType();
  }, [selectedMilestoneType, grant.uid, generalArray]);

  const updatesLength =
    grant.milestones.filter((i) => i.completed).length + updates.length;
  const milestonesCounter = milestones.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3">
        <div className=" flex flex-col items-start justify-start gap-0 ">
          <div className="flex w-full flex-row flex-wrap items-center justify-between gap-4 py-3">
            <div className="flex w-max flex-row flex-wrap items-center  gap-4 max-sm:flex-col max-sm:items-start max-sm:justify-start">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-200">
                MILESTONES
              </p>
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
                {milestonesCounter} {pluralize("Milestone", milestonesCounter)},{" "}
                {updatesLength} {pluralize("update", updatesLength)} in this
                grant
              </p>
            </div>
          </div>

          <div className="mt-3 flex w-full flex-col gap-6">
            {selectedTabArray.map((item) => {
              if (item.type === "update") {
                const updatesArray = generalArray.filter(
                  (i) => i.type === "update"
                );
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
                    title={item.object.title}
                    description={item.object.text}
                    date={item.object.createdAt}
                  />
                );
              }

              const milestoneArray = generalArray.filter(
                (i) => i.type === "milestone"
              );
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
                  isCommunityAdmin={isCommunityAdmin}
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
