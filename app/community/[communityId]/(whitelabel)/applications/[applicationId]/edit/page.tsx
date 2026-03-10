import { Lock } from "lucide-react";
import { Link } from "@/src/components/navigation/Link";
import type { Application } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import { PAGES } from "@/utilities/pages";
import { ApplicationEditClient } from "./ApplicationEditClient";

export default async function ApplicationEditPage({
  params,
}: {
  params: Promise<{ communityId: string; applicationId: string }>;
}) {
  const { communityId, applicationId } = await params;

  const [application] = await fetchData<Application>(
    `/v2/funding-applications/${applicationId}`,
    "GET"
  );

  if (!application) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Application Not Available</h1>
        <p className="mb-6 max-w-md text-muted-foreground">
          This application may be private or does not exist. If this is your application, please
          sign in to view it.
        </p>
        <Link
          href={PAGES.COMMUNITY.ALL_GRANTS(communityId)}
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back to community
        </Link>
      </div>
    );
  }

  return <ApplicationEditClient communityId={communityId} application={application} />;
}
