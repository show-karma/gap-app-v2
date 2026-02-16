"use client";

import { useProjectPermissions } from "@/hooks/useProjectPermissions";

export function ProjectPermissionsBootstrap() {
  useProjectPermissions();
  return null;
}
