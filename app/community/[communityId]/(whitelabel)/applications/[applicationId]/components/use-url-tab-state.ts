"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { ApplicationTabKey } from "./ApplicationTabBar";

const TAB_KEYS = new Set<ApplicationTabKey>(["details", "milestones", "post-approval", "comments"]);

/**
 * Holds the active application tab as instant local UI state while mirroring it
 * to the URL (`?tab=…`) via the History API — so switching is immediate (no Next
 * navigation / server refetch) yet the tab is shareable and survives a refresh.
 * The initial value is read once from the query string; "details" is the default
 * and is represented by the absence of the param (clean URL).
 */
export function useUrlTabState(): [ApplicationTabKey, (key: ApplicationTabKey) => void] {
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<ApplicationTabKey>(() => {
    const t = searchParams.get("tab");
    return t && TAB_KEYS.has(t as ApplicationTabKey) ? (t as ApplicationTabKey) : "details";
  });

  const setActiveTab = useCallback((key: ApplicationTabKey) => {
    setTab(key);
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (key === "details") {
      params.delete("tab");
    } else {
      params.set("tab", key);
    }
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${window.location.pathname}?${query}` : window.location.pathname
    );
  }, []);

  return [tab, setActiveTab];
}
