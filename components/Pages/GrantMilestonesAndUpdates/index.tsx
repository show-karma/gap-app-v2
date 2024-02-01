import { useProjectStore } from "@/store";
import { Grant } from "@show-karma/karma-gap-sdk";
import { useEffect } from "react";
import { MilestonesAndUpdates } from "./screens/MilestonesAndUpdates";
import { useSearchParams } from "next/navigation";

interface GrantMilestonesAndUpdatesProps {
  grant: Grant | undefined;
}

export const GrantMilestonesAndUpdates = ({
  grant,
}: GrantMilestonesAndUpdatesProps) => {
  const searchParams = useSearchParams();
  const screen = searchParams.get("tab");

  return (
    <div className="w-full">
      <MilestonesAndUpdates grant={grant} />
    </div>
  );
};
