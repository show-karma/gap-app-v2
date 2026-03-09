"use client";

import { useParams } from "next/navigation";
import { BrowseApplicationsClient } from "./BrowseApplicationsClient";

export default function BrowseApplicationsPage() {
  const params = useParams<{ communityId: string }>();
  const communityId = params.communityId;

  return (
    <div className="flex flex-col gap-5">
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">Browse Applications</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          View all applications submitted to this community. Track funding requests and review
          project proposals.
        </p>
      </div>

      <BrowseApplicationsClient communityId={communityId} />
    </div>
  );
}
