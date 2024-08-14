"use client";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@/components/Utilities/Button";
import { ArrowPathIcon, ChartBarSquareIcon } from "@heroicons/react/24/solid";
import * as Sentry from "@sentry/nextjs";

interface CommunityStatsProps {
  communityId: string;
}

export default function CommunityStats({ communityId }: CommunityStatsProps) {
  let [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [error, setError] = useState<any>("");
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchStats() {
    setLoading(true);
    try {
      const [data, error]: any = await fetchData(
        INDEXER.COMMUNITY.STATS(communityId as string)
      );
      if (error) {
        console.error("Error fetching data:", error);
        setError(error);
      } else {
        if (data && data?.projects) {
          console.log("Stats fetched:", data);
          setStats({
            "No. of Projects": data?.projects,
            "No. of Project Edits": data?.ProjectEdits,
            "No. of Project Endorsements": data?.ProjectEndorsements,
            "No. of Project Impacts": data?.ProjectImpacts,
            "No. of Project Impact Verifications": data?.ProjectImpactVerifieds,
            "No. of Grants": data?.grants,
            "No. of Grant Edits": data?.GrantEdits,
            "No. of Grant Updates": data?.GrantUpdates,
            "No. of Grant Update Status Posts": data?.GrantUpdateStatuses,
            "No. of Grants Completed": data?.GrantCompleted,
            "No. of Milestones": data?.Milestones,
            "No. of Milestones Completed": data?.MilestoneCompleted,
            "No. of Milestones Verifications": data?.MilestoneVerified,
            "No. of Members Added": data?.MemberOf,
            "Total Attestations":
              data?.projects +
              data?.grants +
              data?.GrantUpdates +
              data?.GrantCompleted +
              data?.ProjectImpacts +
              data?.MemberOf +
              data?.ProjectEndorsements +
              data?.Milestones +
              data?.MilestoneCompleted +
              data?.MilestoneVerified +
              data?.ProjectImpactVerifieds +
              data?.GrantUpdateStatuses +
              data?.GrantEdits +
              data?.ProjectEdits,
          });

          setError("");
        } else {
          console.error("No stats found for community:", communityId);
          setError("No stats found for community");
        }
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      Sentry.captureException(`Error fetching stats: ${error}`);
      setError(error);
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setIsOpen(false);
  }

  async function openModal() {
    setIsOpen(true);
    await fetchStats();
  }

  return (
    <>
      <Button
        onClick={openModal}
        className={
          "flex justify-center items-center gap-x-2 rounded-md bg-transparent dark:bg-transparent px-3 py-2 text-sm font-semibold text-fuchsia-600 dark:text-fuchsia-300 hover:opacity-75 dark:hover:opacity-75 border border-fuchsia-200 dark:border-fuchsia-900 hover:bg-transparent"
        }
      >
        Stats <ChartBarSquareIcon className="h-5 w-5" />
      </Button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b-2 border-zinc-300">
                    <h1 className="font-bold text-xl">Community Stats</h1>
                    <Button onClick={fetchStats} className="bg-zinc-400">
                      <ArrowPathIcon className="h-5 w-5" />
                    </Button>
                  </div>
                  {loading ? (
                    <div>Loading stats...</div>
                  ) : error ? (
                    <div className="font-bold">
                      Error fetching stats: {JSON.stringify(error)}
                    </div>
                  ) : (
                    <>
                      {Object.entries(stats).map(([key, value]) => (
                        <div
                          className="mx-1 flex items-center justify-between"
                          key={key}
                        >
                          <p>{key}</p>
                          <p className="text-blue-500">{value as any}</p>
                        </div>
                      ))}
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
