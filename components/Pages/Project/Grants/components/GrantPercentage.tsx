import { formatPercentage } from "@/utilities/formatNumber";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useMemo } from "react";

type TProps = {
  // TODO: this should be refactored in the source components to pass Grant only
  grant: IGrantResponse;
  className?: string;
};

export const GrantPercentage: React.FC<TProps> = ({ grant, className }) => {
  const percentage = useMemo(() => {
    if (grant.updates && grant.updates.length > 0) {
      const sortedUpdates = [...grant.updates].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      for (const update of sortedUpdates) {
        if (update.data.completionPercentage) {
          //   console.log(grant);
          const manualPercentage = Number(update.data.completionPercentage);
          if (!isNaN(manualPercentage)) {
            return formatPercentage(manualPercentage);
          }
        }
      }
    }

    const milestones = grant.milestones;

    if (milestones && milestones.length > 0) {
      const total = milestones.length;
      const completed = milestones.filter(
        (milestone) => milestone.completed
      ).length;

      return formatPercentage((completed / total) * 100) || 0;
    }

    return 0;
  }, [grant]);

  if (percentage === 0) {
    return null;
  }

  return <span className={className}>{percentage}% complete</span>;
};
