"use client";

import { useParams } from "next/navigation";
import { ManageLayoutShell } from "@/components/Manage/ManageLayoutShell";
import { PermissionProvider } from "@/src/core/rbac/context/permission-context";

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const communityId = params.communityId as string;

  return (
    <PermissionProvider
      resourceContext={{
        communityId,
      }}
    >
      <ManageLayoutShell>{children}</ManageLayoutShell>
    </PermissionProvider>
  );
}
