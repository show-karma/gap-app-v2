"use client";

import { useEffect } from "react";
import FarcasterProvider from "./FarcasterProvider";
import WagmiProvider from "@/components/Utilities/WagmiProvider";
import { useMiniAppStore } from "@/store/miniApp";
import { useMetrics } from "@/hooks/useMetrics";

export const AppCheckerProvider = ({
  children,
  cookie,
}: {
  children: React.ReactNode;
  cookie: string;
}) => {
  const { isMiniApp, setIsMiniApp } = useMiniAppStore();

  const { captureClient } = useMetrics();

  useEffect(() => {
    const url = new URL(window.location.href);
    const isMini =
      url.host.startsWith("afef") ||
      url.host.startsWith("gap-app-v2-git-feat-mini-app-karma-devs") ||
      url.host.startsWith("minigap.") ||
      url.searchParams.get("miniApp") === "true";

    if (isMini) {
      setIsMiniApp(true);
      import("@farcaster/frame-sdk").then(({ sdk }) => {
        // Mini-App–specific bootstrap here
        sdk.actions.ready();
        captureClient.reportEvent({
          event: "mini-app:loaded",
        });
      });
    }
  }, []);

  if (isMiniApp) {
    return <FarcasterProvider cookie={cookie}>{children}</FarcasterProvider>;
  }

  return <WagmiProvider cookie={cookie}>{children}</WagmiProvider>;
};
