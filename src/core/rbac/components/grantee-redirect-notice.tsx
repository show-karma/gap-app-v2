"use client";

import { ArrowRightIcon, IdentificationIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/src/components/navigation/Link";
import { layoutTheme } from "@/src/helper/theme";
import type { GranteeRedirect } from "@/utilities/fundingPlatformUrls";

interface GranteeRedirectNoticeProps {
  redirect: GranteeRedirect;
}

const CTA_LABEL: Record<GranteeRedirect["kind"], string> = {
  application: "View your application",
  dashboard: "Go to your dashboard",
};

/**
 * Shown when a denied user on a funding-platform manage page is actually an
 * applicant. Instead of the generic "Access Denied" box, it points them to
 * their own application page. Presentational only — the caller resolves the
 * destination (whitelabel-aware) so the label and href can't diverge.
 */
export function GranteeRedirectNotice({ redirect }: GranteeRedirectNoticeProps) {
  const buttonLabel = CTA_LABEL[redirect.kind];
  const isExternal = redirect.url.startsWith("http");

  return (
    <div className={layoutTheme.padding}>
      <Card className="max-w-2xl mx-auto border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
        <CardContent className="flex flex-col items-center gap-4 py-10 px-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
            <IdentificationIcon
              className="h-7 w-7 text-blue-600 dark:text-blue-300"
              aria-hidden="true"
            />
          </div>
          <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
            Looking for your application?
          </h2>
          <p className="max-w-md text-blue-800 dark:text-blue-200">
            This page is for program reviewers and admins. As an applicant you have your own page to
            view your application and track its status — let&apos;s take you there.
          </p>
          {isExternal ? (
            <Button asChild>
              <a href={redirect.url}>
                {buttonLabel}
                <ArrowRightIcon className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          ) : (
            <Button asChild>
              <Link href={redirect.url} useBuilder={false}>
                {buttonLabel}
                <ArrowRightIcon className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
