"use client";

import { Check, Info, Loader2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { useRegisterSlackWorkspace } from "@/hooks/useSlackOauth";
import { SlackOauthAddToSlackButton } from "./SlackOauthAddToSlackButton";
import { SlackOauthTextField } from "./SlackOauthTextField";

const SLACK_OAUTH_DISTRIBUTED = process.env.NEXT_PUBLIC_SLACK_OAUTH_DISTRIBUTED === "true";

/**
 * Empty-state for the Slack OAuth card. Two install paths:
 *
 *   1. Distributed (Segment 2, gated by NEXT_PUBLIC_SLACK_OAUTH_DISTRIBUTED):
 *      one-click "Add to Slack" button — preferred when the Karma Slack
 *      App is published. Token never touches the admin's clipboard.
 *
 *   2. Manual paste (Segment 1): admin creates a Slack App from the
 *      Karma manifest, installs it, and pastes the bot token. Always
 *      available as a fallback (collapsed by default when the
 *      distributed flow is on, expanded otherwise).
 *
 * The distributed path is the default when both are enabled — token-
 * paste is a hidden expander labeled "Advanced: paste manually" so
 * customers don't see two competing primary CTAs.
 */
export function SlackOauthRegisterForm({ communitySlug }: { communitySlug: string }) {
  const { mutate, isPending } = useRegisterSlackWorkspace(communitySlug);
  const [teamId, setTeamId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [botUserId, setBotUserId] = useState("");
  const [botToken, setBotToken] = useState("");
  // When the distributed button is shown, the manual form starts
  // collapsed. When distributed is off, the manual form is the only
  // path so it's expanded.
  const [showManual, setShowManual] = useState(!SLACK_OAUTH_DISTRIBUTED);

  const canSubmit = teamId.trim() && teamName.trim() && botUserId.trim() && botToken.trim();

  const handleSubmit = () => {
    mutate(
      {
        teamId: teamId.trim(),
        teamName: teamName.trim(),
        botUserId: botUserId.trim(),
        botToken: botToken.trim(),
      },
      {
        onSuccess: () => toast.success("Slack workspace registered"),
        onError: (err) => toast.error(err.message || "Failed to register workspace"),
      }
    );
  };

  const handleSubmitEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit && !isPending) handleSubmit();
  };

  return (
    <div className="space-y-4 px-5 py-4">
      {SLACK_OAUTH_DISTRIBUTED ? (
        <div className="space-y-3">
          <p className="text-sm text-stone-700 dark:text-zinc-300">
            Connect your Slack workspace to enable direct-message notifications. Karma will redirect
            you to Slack to confirm the install.
          </p>
          <SlackOauthAddToSlackButton communitySlug={communitySlug} />
        </div>
      ) : null}

      {SLACK_OAUTH_DISTRIBUTED && !showManual ? (
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className="text-xs font-medium text-stone-500 underline-offset-2 hover:underline dark:text-zinc-400"
          aria-expanded={false}
          aria-controls="slack-manual-form"
        >
          Advanced: paste a bot token manually
        </button>
      ) : null}

      {showManual ? (
        <form
          id="slack-manual-form"
          onSubmit={handleSubmitEvent}
          className="space-y-4 border-t border-stone-100 pt-4 dark:border-zinc-800"
        >
          <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-900/40 dark:bg-blue-950/30">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
            <p className="text-xs text-blue-900 dark:text-blue-200">
              {
                "Create a Slack App from the Karma manifest, install it into your workspace, then paste the bot token here. Team ID starts with T; bot user ID starts with U or W."
              }
            </p>
          </div>

          <SlackOauthTextField
            label="Team ID"
            value={teamId}
            onChange={setTeamId}
            placeholder="T0123ABCD"
            disabled={isPending}
          />
          <SlackOauthTextField
            label="Team name"
            value={teamName}
            onChange={setTeamName}
            placeholder="Acme Inc."
            disabled={isPending}
          />
          <SlackOauthTextField
            label="Bot user ID"
            value={botUserId}
            onChange={setBotUserId}
            placeholder="U01AB2CDEF"
            disabled={isPending}
          />
          <SlackOauthTextField
            label="Bot token"
            value={botToken}
            onChange={setBotToken}
            placeholder="xoxb-…"
            disabled={isPending}
            type="password"
          />

          <Button
            type="submit"
            disabled={!canSubmit || isPending}
            aria-label="Register Slack workspace"
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            )}
            Register workspace
          </Button>
        </form>
      ) : null}
    </div>
  );
}
