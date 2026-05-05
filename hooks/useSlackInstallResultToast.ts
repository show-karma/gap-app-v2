import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { slackOauthKeys } from "@/utilities/queryKeys/slackOauth";

/**
 * Reads `?slack_install=...&team=...` query params on mount, shows the
 * matching toast, then strips the params from the URL so refresh
 * doesn't re-fire the toast.
 *
 * The Slack OAuth callback (gap-indexer `/v2/slack-oauth/callback`)
 * 302s back to `${KARMA_WEB_URL}/settings?slack_install=success|denied|invalid|failed&team=...`.
 * The FE has no other channel to learn the install outcome — we don't
 * own the redirect-back URL on Slack's side, so the query string is the
 * contract.
 *
 * Status flag mapping (matches gap-indexer
 * slack-oauth-install.controller.ts):
 *   success — install completed, workspace persisted
 *   denied  — user cancelled on Slack's consent screen
 *   invalid — code or state missing on the callback URL (very rare —
 *             usually a misconfigured Slack app)
 *   failed  — state signature failed, nonce expired, oauth.v2.access
 *             rejected, or any other server-side error during install
 *
 * The hook also invalidates the workspace query on success so the card
 * re-fetches and immediately shows the populated state without the
 * admin needing to refresh.
 */
export function useSlackInstallResultToast(communitySlug: string | undefined) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Destructure to PRIMITIVES before the effect dep array. Per project
  // pre-PR checklist: `useSearchParams()` and `useRouter()` return
  // objects whose identity can flip on every render in some Next.js
  // versions; depending on them directly re-fires the effect needlessly
  // and can cause double-toasts. Reading the values into stable strings
  // here means the dep array tracks what actually matters: the URL
  // params themselves.
  const flag = searchParams?.get("slack_install") ?? null;
  const teamParam = searchParams?.get("team") ?? null;
  const queryString = searchParams?.toString() ?? "";

  // Guard against React StrictMode double-invoking effects in dev —
  // the toast must only fire once per actual page load.
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    if (!flag) return;

    handledRef.current = true;

    switch (flag) {
      case "success":
        toast.success(teamParam ? `Connected to ${teamParam}` : "Slack workspace connected");
        if (communitySlug) {
          queryClient.invalidateQueries({
            queryKey: slackOauthKeys.workspace(communitySlug),
          });
        }
        break;
      case "denied":
        toast.error("Slack install was cancelled");
        break;
      case "invalid":
        toast.error("Slack install link was incomplete — please try again");
        break;
      case "failed":
        toast.error("Slack install failed. Please try again.");
        break;
      default:
        // Unknown flag value — log nothing, just no-op. A regression
        // that adds a new flag without updating this switch would be
        // visible as "no toast on a flow we expected one for", which
        // is recoverable by the admin retrying.
        return;
    }

    // Strip the install-related params; preserve everything else.
    const params = new URLSearchParams(queryString);
    params.delete("slack_install");
    params.delete("team");
    const remaining = params.toString();
    const url = remaining ? `${window.location.pathname}?${remaining}` : window.location.pathname;
    router.replace(url, { scroll: false });
    // `router` deliberately omitted from the dep array — the Next
    // router is stable across renders. `queryClient` is also stable
    // (singleton from QueryClientProvider). Including either in deps
    // would mean re-running on a no-op identity flip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flag, teamParam, queryString, communitySlug]);
}
