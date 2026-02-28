"use client";

import { CheckCircle2, CreditCard, Info, Mail } from "lucide-react";
import type { ApplicationLookupResult } from "../types";

interface ApplicationFoundResultProps {
  result: ApplicationLookupResult;
  currentCommunitySlug?: string;
}

export function ApplicationFoundResult({
  result,
  currentCommunitySlug,
}: ApplicationFoundResultProps) {
  const isCommunityMismatch =
    result.communitySlug &&
    currentCommunitySlug &&
    result.communitySlug !== currentCommunitySlug;

  const hasEmail = Boolean(result.maskedEmail);
  const hasWallet = Boolean(result.maskedWallet);
  const hasBoth = hasEmail && hasWallet;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
              Application Found
            </h3>
            <p className="mt-1 text-sm text-green-700 dark:text-green-300">
              We found your application!{" "}
              {hasBoth
                ? "Here are the credentials available:"
                : "Here is the credential used to create it:"}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
          <div className="space-y-3">
            {hasWallet && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Wallet Address
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <code className="font-mono text-sm">
                    {result.maskedWallet}
                  </code>
                </div>
              </div>
            )}

            {hasEmail && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Email Address
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <code className="font-mono text-sm">
                    {result.maskedEmail}
                  </code>
                </div>
              </div>
            )}

            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold">To access your application:</span>
                <br />
                {hasBoth
                  ? "Please log out and log back in using either the wallet address or email address shown above."
                  : hasWallet
                    ? "Please log out and log back in using the wallet address shown above."
                    : "Please log out and log back in using the email address shown above."}
              </p>
            </div>
          </div>
        </div>

        {isCommunityMismatch && result.communityName && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                  Community/Tenant
                </p>
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                  This application belongs to{" "}
                  <span className="font-semibold">{result.communityName}</span>.
                  Make sure you&apos;re on the correct community site to access
                  it.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 text-xs text-green-700 dark:text-green-300">
          <span className="font-medium">Reference:</span>{" "}
          {result.referenceNumber}
        </div>
      </div>
    </div>
  );
}
