"use client";

import { useParams } from "next/navigation";
import { PermissionProvider } from "@/src/core/rbac/context/permission-context";

export default function FundingPlatformLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const communityId = params.communityId as string;
  const programId = params.programId as string | undefined;
  const applicationId = params.applicationId as string | undefined;
  const milestoneId = params.milestoneId as string | undefined;

  return (
    <PermissionProvider
      resourceContext={{
        communityId,
        programId,
        applicationId,
        milestoneId,
      }}
    >
      {children}
    </PermissionProvider>
  );
}
