"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Redirect from /applications to /my-applications.
 * In gap-app-v2, the community is always in the URL.
 */
export default function UserApplicationsPage() {
  const params = useParams<{ communityId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/community/${params.communityId}/my-applications`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router is stable but creates new ref each render
  }, [params.communityId]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="ml-3 text-muted-foreground">Redirecting...</p>
    </div>
  );
}
