import { Grant } from "@show-karma/karma-gap-sdk";
import { MilestonesAndUpdates } from "./screens/MilestonesAndUpdates";

interface GrantMilestonesAndUpdatesProps {
  grant: Grant | undefined;
}

export const GrantMilestonesAndUpdates = ({
  grant,
}: GrantMilestonesAndUpdatesProps) => {
  return (
    <div className="w-full">
      <MilestonesAndUpdates grant={grant} />
    </div>
  );
};
