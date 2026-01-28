"use client";

import { RocketLaunchIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { useKarmaSeeds } from "@/hooks/useKarmaSeeds";
import { useProjectStore } from "@/store";
import { useKarmaSeedsModalStore } from "@/store/modals/karmaSeeds";

interface LaunchKarmaSeedsButtonProps {
  projectUID: string;
}

export const LaunchKarmaSeedsButton: FC<LaunchKarmaSeedsButtonProps> = ({ projectUID }) => {
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const { openLaunchModal } = useKarmaSeedsModalStore();
  const { data: karmaSeeds, isLoading } = useKarmaSeeds(projectUID);

  const canLaunch = isProjectOwner || isProjectAdmin;

  if (!canLaunch || karmaSeeds || isLoading) {
    return null;
  }

  return (
    <Button
      onClick={openLaunchModal}
      variant="outline"
      className="flex items-center gap-2 w-full justify-center border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-950"
    >
      <RocketLaunchIcon className="w-5 h-5" />
      Launch Karma Seeds
    </Button>
  );
};

export default LaunchKarmaSeedsButton;
