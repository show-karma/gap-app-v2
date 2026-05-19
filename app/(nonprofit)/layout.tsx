"use client";

import { useAuth } from "@/hooks/useAuth";
import { NonprofitSidebar } from "@/src/features/nonprofit/Sidebar";

export default function NonprofitLayout({ children }: { children: React.ReactNode }) {
  // Mount useAuth here so TokenManager.setPrivyInstance runs before any
  // nonprofit page fires its first authenticated query. Without this the
  // /[slug]/team query races Privy bootstrap and 401s on cold load.
  useAuth();

  return (
    <div className="flex min-h-screen bg-white dark:bg-zinc-900">
      <NonprofitSidebar />
      <div className="flex-1">{children}</div>
    </div>
  );
}
