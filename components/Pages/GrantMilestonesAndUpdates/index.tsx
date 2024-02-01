import { useGrantScreensStore, useProjectStore } from "@/store";
import { Grant } from "@show-karma/karma-gap-sdk";
import { useEffect } from "react";
import { MilestonesAndUpdates } from "./screens/MilestonesAndUpdates";
import { NewGrant } from "./screens";
import { useSearchParams } from "next/navigation";

interface GrantMilestonesAndUpdatesProps {
  grant: Grant | undefined;
}

export const GrantMilestonesAndUpdates = ({
  grant,
}: GrantMilestonesAndUpdatesProps) => {
  const screen = useGrantScreensStore((state) => state.grantScreen);
  const changeScreen = useGrantScreensStore((state) => state.setGrantScreen);
  const project = useProjectStore((state) => state.project);
  const searchParams = useSearchParams();
  const grantTabParam = searchParams.get("grantTab") as any;

  useEffect(() => {
    changeScreen(grantTabParam || "milestones-and-updates");
  }, [grant?.uid, grantTabParam]);

  return (
    <div className="w-full">
      {screen === "milestones-and-updates" && (
        <MilestonesAndUpdates grant={grant} />
      )}
      {(screen === "create-grant" || screen === "edit-grant") &&
        project?.uid && (
          <NewGrant grantToEdit={grant} projectUID={project.uid} />
        )}
    </div>
  );
};
