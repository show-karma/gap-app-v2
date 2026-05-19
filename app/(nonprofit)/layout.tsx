import { NonprofitSidebar } from "@/src/features/nonprofit/Sidebar";

export default function NonprofitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <NonprofitSidebar />
      <div className="flex-1">{children}</div>
    </div>
  );
}
