import type { TabId } from "@/hooks/useReportPageData";
import { cn } from "@/utilities/tailwind";

interface ReportTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  pendingCount: number;
}

export function ReportTabBar({ activeTab, onTabChange, pendingCount }: ReportTabBarProps) {
  return (
    <div className="flex items-center gap-1 border-b border-gray-200 dark:border-zinc-700">
      <button
        type="button"
        className={cn(
          "relative px-4 py-2.5 text-sm font-medium transition-colors",
          activeTab === "pending-verification"
            ? "text-gray-900 dark:text-white"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        )}
        onClick={() => onTabChange("pending-verification")}
      >
        <span className="flex items-center gap-2">
          Pending Verification
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 tabular-nums">
              {pendingCount}
            </span>
          )}
        </span>
        {activeTab === "pending-verification" && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400" />
        )}
      </button>
      <button
        type="button"
        className={cn(
          "relative px-4 py-2.5 text-sm font-medium transition-colors",
          activeTab === "stats"
            ? "text-gray-900 dark:text-white"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        )}
        onClick={() => onTabChange("stats")}
      >
        Stats
        {activeTab === "stats" && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400" />
        )}
      </button>
    </div>
  );
}
