import { FileX, Lock } from "lucide-react";
import { cache } from "react";
import { Link } from "@/src/components/navigation/Link";
import { PermissionProvider } from "@/src/core/rbac/context/permission-context";
import type { Application, FundingProgram } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import { PAGES } from "@/utilities/pages";
import { ApplicationPageClient } from "./ApplicationPageClient";

// Deduplicated across generateMetadata and page render (React.cache — 1 network call total)
const fetchAppWithProgram = cache(async (applicationId: string) => {
  const [app] = await fetchData<Application>(`/v2/funding-applications/${applicationId}`, "GET");
  if (!app) return null;
  const [program] = await fetchData<FundingProgram>(
    `/v2/funding-program-configs/${app.programId}`,
    "GET"
  );
  return { application: app, program: program ?? null };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ communityId: string; applicationId: string }>;
}) {
  const { applicationId } = await params;
  const data = await fetchAppWithProgram(applicationId);
  const refNumber = data?.application?.referenceNumber ?? applicationId;
  const programName = data?.program?.name ?? data?.program?.metadata?.title ?? "Program";
  return {
    title: data ? `Application ${refNumber} — ${programName}` : "Application Not Available",
    robots: { index: false },
  };
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ communityId: string; applicationId: string }>;
}) {
  const { communityId, applicationId } = await params;
  const data = await fetchAppWithProgram(applicationId);

  if (!data?.application) {
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

  return (
    <PermissionProvider
      resourceContext={{
        programId: data.program?.programId,
        applicationId,
      }}
    >
      <ApplicationPageClient
        communityId={communityId}
        application={data.application}
        program={data.program}
      />
    </PermissionProvider>
  );
}
