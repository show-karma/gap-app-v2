"use client";

import { FileX } from "lucide-react";
import { useParams } from "next/navigation";
import { Link } from "@/src/components/navigation/Link";
import { PAGES } from "@/utilities/pages";

export default function ReportMonthNotFound() {
  const params = useParams<{ communityId: string }>();
  const communityId = params?.communityId ?? "";

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <FileX className="h-6 w-6 text-zinc-500 dark:text-zinc-400" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Report not found</h1>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find a report at this URL. It may have been removed, or the month format
          is invalid.
        </p>
        {communityId ? (
          <Link
            href={PAGES.COMMUNITY.REPORTS(communityId)}
            className="mt-2 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            ← Back to reports
          </Link>
        ) : null}
      </div>
    </div>
  );
}
