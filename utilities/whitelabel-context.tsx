"use client";

import { createContext, useContext } from "react";

interface WhitelabelContextValue {
  isWhitelabel: boolean;
  communitySlug: string | null;
}

const WhitelabelCtx = createContext<WhitelabelContextValue>({
  isWhitelabel: false,
  communitySlug: null,
});

export function WhitelabelProvider({
  isWhitelabel,
  communitySlug,
  children,
}: WhitelabelContextValue & { children: React.ReactNode }) {
  return (
    <WhitelabelCtx.Provider value={{ isWhitelabel, communitySlug }}>
      {children}
    </WhitelabelCtx.Provider>
  );
}

export function useWhitelabel(): WhitelabelContextValue {
  return useContext(WhitelabelCtx);
}
