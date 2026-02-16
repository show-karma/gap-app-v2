"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import HotjarAnalytics from "@/components/Utilities/HotjarAnalytics";

const PROJECT_ROUTE_HOTJAR_DEFER_TIMEOUT_MS = 60_000;

/**
 * Defers Hotjar bootstrap on project profile routes to keep
 * initial JS execution lower for LCP/TBT-critical pages.
 */
export function DeferredHotjarAnalytics() {
  const pathname = usePathname();
  const isProjectRoute = pathname?.startsWith("/project/");
  const [shouldMountHotjar, setShouldMountHotjar] = useState(
    () => process.env.NODE_ENV === "test" || !isProjectRoute
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      setShouldMountHotjar(true);
      return;
    }

    if (!isProjectRoute) {
      setShouldMountHotjar(true);
      return;
    }

    if (shouldMountHotjar) {
      return;
    }

    const mountHotjar = () => setShouldMountHotjar(true);

    if (typeof window.requestIdleCallback === "function") {
      const idleCallbackId = window.requestIdleCallback(mountHotjar, {
        timeout: PROJECT_ROUTE_HOTJAR_DEFER_TIMEOUT_MS,
      });
      return () => {
        window.cancelIdleCallback(idleCallbackId);
      };
    }

    const timeoutId = window.setTimeout(mountHotjar, PROJECT_ROUTE_HOTJAR_DEFER_TIMEOUT_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isProjectRoute, shouldMountHotjar]);

  if (!shouldMountHotjar) {
    return null;
  }

  return <HotjarAnalytics />;
}
