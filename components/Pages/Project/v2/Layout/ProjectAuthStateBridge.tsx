"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export interface ProjectAuthState {
  authenticated: boolean;
  login: () => void;
}

interface ProjectAuthStateBridgeProps {
  onAuthStateChange: (state: ProjectAuthState) => void;
}

/**
 * Isolates the auth hook behind a lazily-loaded boundary so the heavy auth bundle
 * is not part of the initial project layout chunk.
 */
export function ProjectAuthStateBridge({ onAuthStateChange }: ProjectAuthStateBridgeProps) {
  const { authenticated, login } = useAuth();

  useEffect(() => {
    onAuthStateChange({ authenticated, login });
  }, [authenticated, login, onAuthStateChange]);

  return null;
}
