"use client";
import { useEffect } from "react";

export const FarcasterProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  useEffect(() => {
    const url = new URL(window.location.href);
    const isMini =
      url.pathname.startsWith("/mini") ||
      url.searchParams.get("miniApp") === "true";
    console.log(url.searchParams.get("miniApp"));

    if (isMini) {
      import("@farcaster/frame-sdk").then(({ sdk }) => {
        // Mini-App–specific bootstrap here
        sdk.actions.ready();
      });
    }
  }, []);
  return children;
};
