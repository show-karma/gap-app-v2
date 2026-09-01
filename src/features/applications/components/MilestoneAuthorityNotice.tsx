"use client";

// The two variants are deliberately distinct: an unresolved lookup is NOT a
// denial — telling an authorized grantee they lack access sends them chasing
// permissions they already hold.
type MilestoneAuthorityNoticeProps =
  | { variant: "denied" }
  | { variant: "unverified"; onRetry: () => void };

/**
 * Amber notice explaining why milestone submission is blocked. `<output>`
 * keeps it an accessible live region (biome's `useSemanticElements` rejects
 * `role="status"` on a div).
 */
export function MilestoneAuthorityNotice(props: MilestoneAuthorityNoticeProps) {
  return (
    <output className="mx-5 mt-5 block rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      {props.variant === "denied" ? (
        "Your account is not authorized on the Karma project behind this application, so milestone updates submitted from here would not be recorded. Ask a project owner or admin to add you as a member of the project, then reload this page."
      ) : (
        <>
          We could not verify your permissions on the Karma project behind this application, so
          milestone updates are disabled here for now. Contact the program admins if this keeps
          happening.{" "}
          <button
            type="button"
            onClick={props.onRetry}
            className="font-medium underline underline-offset-2"
          >
            Retry
          </button>
        </>
      )}
    </output>
  );
}
