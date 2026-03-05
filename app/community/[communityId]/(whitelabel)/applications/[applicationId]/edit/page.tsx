import { notFound } from "next/navigation";
import type { Application, ApplicationStatus } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import { ApplicationEditClient } from "./ApplicationEditClient";

const EDITABLE_STATUSES: ApplicationStatus[] = [
  "pending",
  "revision_requested",
  "rejected",
  "resubmitted",
];

export default async function ApplicationEditPage({
  params,
}: {
  params: Promise<{ communityId: string; applicationId: string }>;
}) {
  const { communityId, applicationId } = await params;

  const [application] = await fetchData<Application>(
    `/v2/funding-applications/${applicationId}`,
    "GET",
    {},
    {},
    {},
    false
  );

  if (!application || !EDITABLE_STATUSES.includes(application.status)) {
    notFound();
  }

  return <ApplicationEditClient communityId={communityId} application={application} />;
}
