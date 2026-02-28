"use client";

import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProgramByline } from "@/features/programs/components/ProgramByline";
import { ProgramDetailsSidebar } from "@/features/programs/components/ProgramDetailsSidebar";
import { useProgram } from "@/features/programs/hooks/use-program";

function isProgramEnabled(program: {
  applicationConfig: { isEnabled: boolean; formSchema?: unknown } | null;
  metadata: { startsAt?: string; endsAt?: string };
}): boolean {
  const isEnabled = program.applicationConfig?.isEnabled ?? false;
  const hasFormConfig = !!program.applicationConfig?.formSchema;
  const isDeadlinePassed = program.metadata?.endsAt
    ? new Date(program.metadata.endsAt) < new Date()
    : false;
  const now = new Date();
  const startsAt = program.metadata?.startsAt
    ? new Date(program.metadata.startsAt)
    : null;
  const endsAt = program.metadata?.endsAt
    ? new Date(program.metadata.endsAt)
    : null;
  const isOpen = startsAt && endsAt ? now >= startsAt && now <= endsAt : true;
  return hasFormConfig && isEnabled && isOpen && !isDeadlinePassed;
}

export default function ProgramDetailPage() {
  const { communityId, programId } = useParams<{
    communityId: string;
    programId: string;
  }>();

  const { program, loading, error, refetch } = useProgram(programId);

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="flex-1 space-y-4">
            <div className="h-10 w-3/4 animate-pulse rounded-lg bg-muted" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="h-80 w-full animate-pulse rounded-xl bg-muted lg:w-96" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-xl font-semibold">Failed to load program</h1>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!program) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center">
          <h1 className="text-xl font-semibold">Program not found</h1>
          <p className="text-sm text-muted-foreground">
            The program you are looking for does not exist or has been removed.
          </p>
          <Link
            href={`/community/${communityId}/programs`}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Browse programs
          </Link>
        </div>
      </div>
    );
  }

  const isEnabled = isProgramEnabled(program);
  const description =
    program.metadata?.description || "No description available";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Back link */}
      <Link
        href={`/community/${communityId}/programs`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to programs
      </Link>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Main Content */}
        <div className="flex-1">
          {/* Banner Image */}
          {program.metadata?.bannerImg ? (
            <div className="mb-6 overflow-hidden rounded-xl">
              <img
                src={program.metadata.bannerImg}
                alt={`${program.metadata?.title || program.name} banner`}
                className="h-48 w-full object-cover"
              />
            </div>
          ) : null}

          {/* Title */}
          <h1 className="mb-2 text-3xl font-bold text-foreground">
            {program.metadata?.title || program.name}
          </h1>

          {/* Byline */}
          {program.communitySlug ? (
            <div className="mb-6">
              <ProgramByline
                tenantName={program.communitySlug}
                tenantLogo={program.metadata?.logoImg}
                socialLinks={program.metadata?.socialLinks}
              />
            </div>
          ) : null}

          {/* Description */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="whitespace-pre-wrap text-foreground">{description}</p>
          </div>
        </div>

        {/* Sidebar */}
        <ProgramDetailsSidebar
          program={program}
          communityId={communityId}
          isEnabled={isEnabled}
        />
      </div>
    </div>
  );
}
