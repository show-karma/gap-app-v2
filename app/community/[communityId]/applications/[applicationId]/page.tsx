import { notFound } from "next/navigation";
import { cache } from "react";
import { PermissionProvider } from "@/src/core/rbac/context/permission-context";
import type { Application, FundingProgram } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import { ApplicationPageClient } from "./ApplicationPageClient";

// Deduplicated across generateMetadata and page render (React.cache — 1 network call total)
const fetchAppWithProgram = cache(async (applicationId: string) => {
  const [app] = await fetchData<Application>(
    `/v2/funding-applications/${applicationId}`,
    "GET",
    {},
    {},
    {},
    false
  );
  if (!app) return null;
  const [program] = await fetchData<FundingProgram>(
    `/v2/funding-program-configs/${app.programId}`,
    "GET",
    {},
    {},
    {},
    false
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
    title: `Application ${refNumber} — ${programName}`,
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
  if (!data?.application) notFound();

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
