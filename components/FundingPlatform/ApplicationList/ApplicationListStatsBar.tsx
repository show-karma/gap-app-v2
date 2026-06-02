"use client";

import type { FC } from "react";
import type { IApplicationStatistics } from "@/types/funding-platform";

interface ApplicationListStatsBarProps {
  stats?: IApplicationStatistics;
}

export const ApplicationListStatsBar: FC<ApplicationListStatsBarProps> = ({ stats }) => {
  if (!stats) return null;

  const statsMap = [
    { title: "Total Applications", value: stats.totalApplications || 0 },
    { title: "Pending Review", value: stats.pendingApplications || 0 },
    { title: "Revision Requested", value: stats.revisionRequestedApplications || 0 },
    { title: "Under Review", value: stats.underReviewApplications || 0 },
    { title: "Approved", value: stats.approvedApplications || 0 },
    { title: "Rejected", value: stats.rejectedApplications || 0 },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
      {statsMap.map((item) => (
        <div
          key={item.title}
          className="bg-white dark:bg-zinc-800 p-4 rounded-lg border items-center justify-center"
        >
          <div className="text-2xl font-bold text-gray-900 dark:text-white text-center">
            {item.value.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center">{item.title}</div>
        </div>
      ))}
    </div>
  );
};
