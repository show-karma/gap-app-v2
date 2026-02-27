"use client";

import { PermissionProvider } from "@/src/core/rbac/context/permission-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <PermissionProvider>{children}</PermissionProvider>;
}
