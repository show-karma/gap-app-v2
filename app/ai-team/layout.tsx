"use client";

import { useAuth } from "@/hooks/useAuth";

export default function AITeamLayout({ children }: { children: React.ReactNode }) {
  // Mount useAuth so TokenManager.setPrivyInstance runs before any
  // /ai-team page fires its first authenticated query. Without this the
  // initial query races Privy bootstrap and 401s on cold load.
  useAuth();
  return children;
}
