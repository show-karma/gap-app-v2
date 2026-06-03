"use client";

import { Link } from "@/src/components/navigation/Link";

export default function ApplicationReviewRedirectError() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">Link could not be opened</h1>
      <p className="text-sm text-muted-foreground">
        We couldn’t resolve this application review link. It may have expired, or the program may no
        longer exist.
      </p>
      <Link href="/" className="text-sm font-medium text-primary underline underline-offset-4">
        Go home
      </Link>
    </div>
  );
}
