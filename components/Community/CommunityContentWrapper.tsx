"use client";

import { usePathname } from "next/navigation";
import { layoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

/**
 * Conditionally applies padding to community content.
 * Manage pages have their own sidebar layout with built-in padding,
 * so they skip the outer padding wrapper.
 */
export function CommunityContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isManagePage = pathname.includes("/manage");

  if (isManagePage) {
    return <div className="w-full max-w-full">{children}</div>;
  }

  return <div className={cn(layoutTheme.padding, "w-full max-w-full")}>{children}</div>;
}
