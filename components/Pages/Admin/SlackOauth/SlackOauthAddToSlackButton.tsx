"use client";

import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useStartSlackInstall } from "@/hooks/useSlackOauth";

/**
 * "Add to Slack" button — entry point for the distributed OAuth install
 * flow (Segment 2). Primary CTA in the empty-state register form;
 * manual paste lives behind an "Advanced" expander.
 *
 * Click flow:
 *   1. Authed fetch to /v2/slack-oauth/authorize-url → returns the
 *      slack.com authorize URL (server mints a signed state + Redis nonce
 *      with 10-min TTL).
 *   2. window.location.href = authorizeUrl → browser navigates to Slack
 *      consent screen. The Karma page unloads; no SPA state to preserve.
 *   3. After consent, Slack redirects to our /callback, which redeems
 *      the nonce + exchanges the OAuth code, then 302s back to
 *      /settings?slack_install=success&team=... where the toast handler
 *      reports the outcome.
 *
 * Visual treatment follows Slack's brand guidelines: black-on-white
 * with the Slack logo. We render an inline SVG to avoid pulling another
 * brand-asset bundle just for this button.
 */
export function SlackOauthAddToSlackButton({
  communitySlug,
  variant = "primary",
  label = "Add to Slack",
  pendingLabel = "Connecting…",
  ariaLabel = "Add Karma to Slack",
}: {
  communitySlug: string;
  variant?: "primary" | "compact" | "subtle";
  label?: string;
  pendingLabel?: string;
  ariaLabel?: string;
}) {
  const { mutate, isPending } = useStartSlackInstall(communitySlug);

  const handleClick = () => {
    mutate(undefined, {
      onError: (err) => toast.error(err.message || "Could not start Slack install"),
    });
  };

  const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const variantClasses = (() => {
    if (variant === "primary") {
      return "h-11 w-full px-5 text-sm bg-slack-aubergine text-white hover:bg-slack-aubergine-hover";
    }
    if (variant === "compact") {
      return "h-9 px-3 text-xs bg-slack-aubergine text-white hover:bg-slack-aubergine-hover";
    }
    return "h-9 px-3 text-xs border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";
  })();

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={ariaLabel}
      className={`${baseClasses} ${variantClasses}`}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <SlackLogo className={variant === "primary" ? "h-5 w-5" : "h-4 w-4"} />
      )}
      <span>{isPending ? pendingLabel : label}</span>
    </button>
  );
}

// Slack's iconic four-square logo. Inline SVG with brand colors so we
// don't depend on an icon-library version that includes it. Source:
// https://api.slack.com/docs/sign-in-with-slack#use_a_button_in_your_app
function SlackLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 122.8 122.8"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9z"
        fill="#E01E5A"
      />
      <path
        d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9z"
        fill="#36C5F0"
      />
      <path
        d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9z"
        fill="#2EB67D"
      />
      <path
        d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9z"
        fill="#ECB22E"
      />
    </svg>
  );
}
