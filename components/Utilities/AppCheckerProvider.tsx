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
      url.host.startsWith("miniapp.") ||
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
