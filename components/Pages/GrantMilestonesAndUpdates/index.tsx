import { MilestonesAndUpdates } from "./screens/MilestonesAndUpdates";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

interface GrantMilestonesAndUpdatesProps {
  grant: IGrantResponse | undefined;
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
