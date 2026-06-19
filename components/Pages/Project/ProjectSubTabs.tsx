"use client";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProjectStore } from "@/store";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { compareAllWallets } from "@/utilities/auth/compare-all-wallets";
import { EndorsementList } from "../ProgramRegistry/EndorsementList";

export const ProjectSubTabs = () => {
  const project = useProjectStore((state) => state.project);
  const { setIsEndorsementOpen: setIsOpen } = useEndorsementStore();
  const { isConnected, authenticated: isAuth, user, login } = useAuth();

  const userHasEndorsed = useMemo(() => {
    if (!isConnected || !isAuth || !user || !project?.endorsements?.length) return false;
    // Match against ALL the user's linked wallets — an endorsement made with one
    // embedded/linked wallet must still register when acting with another.
    return project.endorsements.some(
      (endorsement) => endorsement.recipient && compareAllWallets(user, endorsement.recipient)
    );
  }, [user, isConnected, isAuth, project?.endorsements]);
  return (
    <div className="flex flex-col border border-zinc-300 rounded-xl w-full">
      <div className="flex flex-row gap-1 justify-between items-center border-b border-b-zinc-300">
        <p className="text-base py-4 mx-4 px-2.5 text-[#30374F] dark:text-zinc-300 font-bold">
          Endorsements
        </p>
        <div className="flex flex-row gap-2 p-2 justify-end">
          <Tooltip.Provider>
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger asChild>
                <div>
                  <button
                    type="button"
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
