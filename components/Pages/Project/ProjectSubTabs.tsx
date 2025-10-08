"use client";
import { EndorsementList } from "../ProgramRegistry/EndorsementList";
import { useMemo } from "react";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { useAccount } from "wagmi";
import { useAuth } from "@/hooks/useAuth";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useProjectStore } from "@/store";

export const ProjectSubTabs = () => {
  const project = useProjectStore((state) => state.project);
  const { setIsEndorsementOpen: setIsOpen } = useEndorsementStore();
  const { address, isConnected } = useAccount();
  const { authenticated: isAuth, login } = useAuth();

  const userHasEndorsed = useMemo(() => {
    if (!address || !isConnected || !isAuth || !project?.endorsements?.length)
      return false;
    return project.endorsements.some(
      (endorsement) =>
        endorsement.recipient?.toLowerCase() === address.toLowerCase()
    );
  }, [address, isConnected, isAuth, project?.endorsements]);
  return (
    <div className="flex flex-col border border-zinc-300 rounded-xl w-full">
      <div className="flex flex-row gap-1 justify-between items-center border-b border-b-zinc-300">
        <p className="text-base py-4 mx-4 px-2.5 text-[#30374F] dark:text-zinc-300 font-bold">
          Endorsements
        </p>
        <div className="flex flex-row gap-2 px-2 py-2 justify-end">
          <Tooltip.Provider>
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger asChild>
                <div>
                  <button
                    onClick={() => {
                      if (isConnected) {
                        setIsOpen(true);
                      } else {
                        login?.();
                      }
                    }}
                    className="whitespace-nowrap text-blue-600 text-sm px-4 py-2 rounded-md underline bg-transparent hover:bg-transparent transition-colors"
                  >
                    Endorse this project
                  </button>
                </div>
              </Tooltip.Trigger>
              {userHasEndorsed && (
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="rounded-lg bg-white p-2 text-sm text-gray-700 shadow-lg dark:bg-zinc-800 dark:text-gray-300 z-50"
                    sideOffset={5}
                    side="bottom"
                  >
                    <p>You have already endorsed this project.</p>
                    <Tooltip.Arrow className="fill-white dark:fill-zinc-800" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              )}
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      </div>
      <EndorsementList />
    </div>
  );
};
