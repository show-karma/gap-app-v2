import { AlertTriangle, ArrowLeft, FileQuestion } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import type { FundingProgram } from "@/services/fundingPlatformService";
import { Link } from "@/src/components/navigation/Link";
import { transformFormSchemaToQuestions } from "@/src/features/applications/lib/form-utils";
import fetchData from "@/utilities/fetchData";
import { isProgramEnabled } from "@/utilities/funding-programs";
import { PAGES } from "@/utilities/pages";
import { ApplicationFormClient } from "./ApplicationFormClient";

interface PageProps {
  params: Promise<{
    communityId: string;
    programId: string;
  }>;
}

// React.cache() deduplicates the fetch across generateMetadata and the page component
const getProgramDetails = cache(async (programId: string): Promise<FundingProgram | null> => {
  try {
    const [data] = await fetchData<FundingProgram>(
      `/v2/funding-program-configs/${programId}`,
      "GET",
      {},
      {},
      {},
      false // public endpoint — no auth required
    );
    return data;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { programId } = await params;
  const program = await getProgramDetails(programId);

  if (!program) {
    return { title: "Apply to Program" };
  }

  const title =
    program.applicationConfig?.formSchema?.title || program.metadata?.title || program.name;
  return {
    title: `Apply for ${title}`,
    description: `Submit your application for the ${title} funding program`,
  };
}

export default async function ApplicationApplyPage({ params }: PageProps) {
  const { communityId, programId } = await params;

  const program = await getProgramDetails(programId); // cache HIT — no second fetch
  if (!program) {
    notFound();
  }

  const formSchema = program.applicationConfig?.formSchema;
  if (!formSchema?.fields?.length) {
    return (
      <div className="flex flex-col gap-5">
        <div className="max-w-2xl mx-auto rounded-lg border bg-card p-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-muted">
              <FileQuestion className="w-12 h-12 text-muted-foreground" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-3">Application Form Not Available Yet</h2>
          <p className="text-muted-foreground mb-2">
            This program doesn&apos;t have an application form configured yet.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            The program administrator needs to set up the application questions.
            <br />
            Please check back later or contact the program team for more information.
          </p>
          <Link
            href={PAGES.COMMUNITY.PROGRAMS(communityId)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to Programs
          </Link>
        </div>
      </div>
    );
  }

  const questions = transformFormSchemaToQuestions(formSchema);
  const isDisabled = !isProgramEnabled(program);
  const isDeadlinePassed = program.metadata?.endsAt
    ? new Date(program.metadata.endsAt) < new Date()
    : false;

  const programTitle =
    program.applicationConfig?.formSchema?.title || program.metadata?.title || program.name;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={PAGES.COMMUNITY.PROGRAM_DETAIL(communityId, programId)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to program
      </Link>

      {/* Closed applications banner */}
      {isDisabled && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                Applications Closed
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {isDeadlinePassed
                  ? "The deadline for this program has passed. New applications are no longer being accepted."
                  : "This program is not currently accepting new applications."}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Apply for {programTitle}</h1>
        {formSchema.description && <MarkdownPreview source={formSchema.description as string} />}
      </div>

      <ApplicationFormClient
        communityId={communityId}
        programId={programId}
        questions={questions}
        formSchema={formSchema}
        multiStep={questions.length > 10}
        isDisabled={isDisabled}
        programName={program.name}
      />
    </div>
  );
}
