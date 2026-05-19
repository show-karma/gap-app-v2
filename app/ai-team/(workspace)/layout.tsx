import { NonprofitSidebar } from "@/src/features/nonprofit/Sidebar";

export default function NonprofitWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-zinc-900">
      <NonprofitSidebar />
      <div className="flex-1">{children}</div>
    </div>
  );
}
