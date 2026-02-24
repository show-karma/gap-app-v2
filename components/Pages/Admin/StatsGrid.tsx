import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ExclamationCircleIcon,
  FlagIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/outline";
import { Skeleton } from "@/components/Utilities/Skeleton";
import type { ReportAPIResponse } from "@/hooks/useReportPageData";
import { cn } from "@/utilities/tailwind";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  accentColor: string;
}

function StatCard({ title, value, icon, accentColor }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 transition-all">
      <div className={cn("p-2.5 rounded-lg flex-shrink-0", accentColor)}>{icon}</div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{title}</p>
      </div>
    </div>
  );
}

interface StatsGridProps {
  stats: ReportAPIResponse["stats"] | undefined;
  isLoading: boolean;
}

export function StatsGrid({ stats, isLoading }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {isLoading ? (
        [...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50"
          >
            <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-7 w-16 rounded" />
              <Skeleton className="h-3.5 w-28 rounded" />
            </div>
          </div>
        ))
      ) : (
        <>
          <StatCard
            title="Total Grants"
            value={`${stats?.totalGrants ?? 0}`}
            icon={
              <ClipboardDocumentListIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            }
            accentColor="bg-blue-50 dark:bg-blue-900/20"
          />
          <StatCard
            title="Projects with Milestones"
            value={`${stats?.totalProjectsWithMilestones ?? 0}`}
            icon={<FolderOpenIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
            accentColor="bg-indigo-50 dark:bg-indigo-900/20"
          />
          <StatCard
            title="% with Milestones"
            value={`${stats?.percentageProjectsWithMilestones?.toFixed(1) ?? "0.0"}%`}
            icon={<ChartBarIcon className="w-5 h-5 text-sky-600 dark:text-sky-400" />}
            accentColor="bg-sky-50 dark:bg-sky-900/20"
          />
          <StatCard
            title="Total Milestones"
            value={`${stats?.totalMilestones ?? 0}`}
            icon={<FlagIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
            accentColor="bg-purple-50 dark:bg-purple-900/20"
          />
          <StatCard
            title="Completed"
            value={`${stats?.totalCompletedMilestones ?? 0}`}
            icon={<CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />}
            accentColor="bg-green-50 dark:bg-green-900/20"
          />
          <StatCard
            title="Pending"
            value={`${stats?.totalPendingMilestones ?? 0}`}
            icon={<ClockIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
            accentColor="bg-orange-50 dark:bg-orange-900/20"
          />
          <StatCard
            title="Completion Rate"
            value={`${stats?.percentageCompletedMilestones?.toFixed(1) ?? "0.0"}%`}
            icon={
              <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            }
            accentColor="bg-emerald-50 dark:bg-emerald-900/20"
          />
          <StatCard
            title="Pending Rate"
            value={`${stats?.percentagePendingMilestones?.toFixed(1) ?? "0.0"}%`}
            icon={<ExclamationCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            accentColor="bg-amber-50 dark:bg-amber-900/20"
          />
        </>
      )}
    </div>
  );
}
