"use client";

import { usePrivy } from "@privy-io/react-auth";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { FUNDING_PLATFORM_DOMAINS } from "@/src/features/funding-map/utils/funding-platform-domains";
import { envVars } from "@/utilities/enviromentVars";
import { FUNDING_PLATFORM_PAGES } from "@/utilities/pages";

interface AlreadyAppliedBannerProps {
  communitySlug: string;
}

export const AlreadyAppliedBanner = ({ communitySlug }: AlreadyAppliedBannerProps) => {
  const { authenticated, login } = usePrivy();

  const exclusiveDomain =
    FUNDING_PLATFORM_DOMAINS[communitySlug as keyof typeof FUNDING_PLATFORM_DOMAINS];
  const domain = exclusiveDomain
    ? envVars.isDev
      ? exclusiveDomain.dev
      : exclusiveDomain.prod
    : undefined;

  const dashboardUrl = FUNDING_PLATFORM_PAGES(communitySlug, domain).HOME;

  const handleClick = () => {
    if (!authenticated) {
      login();
    }
  };

  return (
    <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-zinc-900 dark:to-zinc-800 p-8">
      <div className="flex flex-col items-center justify-center text-center gap-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Already applied?</h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">
          Sign in to access your Application Dashboard, track submission status, and manage your
          applications.
        </p>
        {authenticated ? (
          <ExternalLink
            href={dashboardUrl}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white font-medium transition-colors"
          >
            Go to Dashboard
          </ExternalLink>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white font-medium transition-colors"
          >
            Sign in to Dashboard
          </button>
        )}
      </div>
    </div>
  );
};
