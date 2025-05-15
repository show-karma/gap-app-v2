"use client";

import { useEffect } from "react";
import FarcasterProvider from "./FarcasterProvider";
import WagmiProvider from "@/components/Utilities/WagmiProvider";
import { useMiniAppStore } from "@/store/miniApp";
import { usePathname, useRouter } from "next/navigation";

export const AppCheckerProvider = ({
  children,
  cookie,
}: {
  children: React.ReactNode;
  cookie: string;
}) => {
  const { isMiniApp, setIsMiniApp } = useMiniAppStore();

  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    const isMini =
      url.host.startsWith("49fd-2804-1b3-a9c0-7fc1-b4d7-9258-1ca9-b") ||
      url.host.startsWith("gap-app-v2-git-feat-mini-app-karma-devs") ||
      url.host.startsWith("minigap.") ||
      url.searchParams.get("miniApp") === "true";

    if (isMini) {
      setIsMiniApp(true);
      import("@farcaster/frame-sdk").then(({ sdk }) => {
        // Mini-App–specific bootstrap here
        sdk.actions.ready();
      });
    }
  }, []);

  if (isMiniApp) {
    return <FarcasterProvider cookie={cookie}>{children}</FarcasterProvider>;
  }

  return <WagmiProvider cookie={cookie}>{children}</WagmiProvider>;
};
