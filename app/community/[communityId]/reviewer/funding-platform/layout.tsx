"use client";

import { useParams } from "next/navigation";
import { PermissionProvider } from "@/src/core/rbac/context/permission-context";
import { layoutTheme } from "@/src/helper/theme";

export default function ReviewerFundingPlatformLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const communityId = params.communityId as string;
  const programId = params.programId as string | undefined;
  const applicationId = params.applicationId as string | undefined;

  return (
    <PermissionProvider
      resourceContext={{
        communityId,
        programId,
        applicationId,
      }}
    >
      <div className={layoutTheme.padding}>{children}</div>
    </PermissionProvider>
  );
}
