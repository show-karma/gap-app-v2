"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

interface UseBackNavigationOptions {
  fallbackRoute: string;
  preferHistoryBack?: boolean;
}

export function useBackNavigation({
  fallbackRoute,
  preferHistoryBack = false,
}: UseBackNavigationOptions) {
  const router = useRouter();

  return useCallback(() => {
    if (preferHistoryBack) {
      // Next.js app router stores a session history index in history.state.idx.
      // If idx is 0/undefined (direct load or refresh with no in-app history), use fallback.
      const historyIndex = window.history.state?.idx;
      if (typeof historyIndex === "number" && historyIndex > 0) {
        router.back();
        return;
      }
    }

    router.push(fallbackRoute);
  }, [fallbackRoute, preferHistoryBack, router]);
}
