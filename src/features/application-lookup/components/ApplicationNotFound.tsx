"use client";

import { AlertTriangle } from "lucide-react";
import type { ApplicationLookupError } from "../types";

interface ApplicationNotFoundProps {
  error: ApplicationLookupError;
  communityName?: string;
}

export function ApplicationNotFound({
  error,
  communityName,
}: ApplicationNotFoundProps) {
  const title =
    error.type === "not_found"
      ? "Application Not Found"
      : error.type === "invalid_format"
        ? "Invalid Reference Number"
        : "Connection Error";

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">
            {title}
          </h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {error.message}
          </p>
          {error.type === "not_found" && (
            <div className="mt-3 text-xs text-red-600 dark:text-red-400">
              <p className="font-medium">Tips:</p>
              <ul className="ml-4 mt-1 list-disc space-y-1">
                <li>Check that you entered the reference number correctly</li>
                <li>Reference numbers look like: APP-XXXXXXXX-XXXXXX</li>
                <li>
                  You should have received this in your confirmation email
                </li>
                {communityName && (
                  <li>
                    Make sure you&apos;re on the correct community - you are
                    currently on{" "}
                    <span className="font-semibold">{communityName}</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
