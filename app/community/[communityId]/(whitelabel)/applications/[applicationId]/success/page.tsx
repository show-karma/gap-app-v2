import { CheckCircle } from "lucide-react";
import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { Link } from "@/src/components/navigation/Link";
import { ApplicationStatusChip } from "@/src/components/ui/ApplicationStatusChip";
import type { Application } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import { PAGES } from "@/utilities/pages";
import { extractApplicantName, WhatHappensNext } from "./WhatHappensNext";
import { WhatHappensNextSkeleton } from "./WhatHappensNextSkeleton";

interface PageProps {
  params: Promise<{
    communityId: string;
    applicationId: string;
  }>;
}

// P1-09: React.cache() deduplicates the fetch between generateMetadata and the page component
const getApplicationDetails = cache(async (applicationId: string): Promise<Application | null> => {
  try {
    const [data] = await fetchData<Application>(
      `/v2/funding-applications/${applicationId}`,
      "GET",
      {},
      {},
      {},
      false
    );
    return data;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { applicationId } = await params;
  const application = await getApplicationDetails(applicationId); // cache HIT if page already called it

  return {
    title: application?.referenceNumber
      ? `Application ${application.referenceNumber} Submitted`
      : "Application Submitted",
    description: "Your funding application has been submitted successfully.",
    robots: { index: false }, // success pages must not be indexed — leaks application IDs
  };
}

export default async function ApplicationSuccessPage({ params }: PageProps) {
  const { communityId, applicationId } = await params;
  const application = await getApplicationDetails(applicationId); // cache HIT — no second fetch

  const templateVariables: Record<string, string> = { applicationId };
  if (application) {
    templateVariables.referenceNumber = application.referenceNumber ?? "";
    templateVariables.applicantEmail = application.applicantEmail ?? "";
    templateVariables.applicantName = extractApplicantName(application.applicationData);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Thanks for submitting!</h1>
        </div>

        <div className="mb-8 rounded-lg border bg-card p-8">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Application ID</p>
              <p className="font-mono text-lg">{applicationId}</p>
            </div>

            {application && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <ApplicationStatusChip status={application.status} size="lg" />
                </div>

                {application.createdAt && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Submitted At</p>
                    <p className="text-lg">
                      {new Date(application.createdAt as string).toLocaleString()}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {application?.programId && (
            <Suspense fallback={<WhatHappensNextSkeleton />}>
              <WhatHappensNext
                programId={application.programId}
                communityId={communityId}
                hasApplication={!!application}
                templateVariables={templateVariables}
              />
            </Suspense>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={PAGES.DASHBOARD}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go to Dashboard
            </Link>
            <Link
              href={PAGES.COMMUNITY.PROGRAMS(communityId)}
              className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Browse programs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
