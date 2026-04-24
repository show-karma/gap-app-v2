"use client";

import { Check, Info, Loader2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { useRegisterSlackWorkspace } from "@/hooks/useSlackOauth";
import { SlackOauthTextField } from "./SlackOauthTextField";

/**
 * Empty-state form for the Slack OAuth card. Collects team + bot-user
 * IDs and the `xoxb-` bot token, POSTs to the backend which validates
 * via `auth.test` + asserts the team matches before persisting.
 *
 * Token input uses `type="password"` so it's masked by default and
 * doesn't surface in clipboard history; the backend encrypts it before
 * persistence, so this is a UX rather than a security boundary.
 */
export function SlackOauthRegisterForm({
  communitySlug,
}: {
  communitySlug: string;
}) {
  const { mutate, isPending } = useRegisterSlackWorkspace(communitySlug);
  const [teamId, setTeamId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [botUserId, setBotUserId] = useState("");
  const [botToken, setBotToken] = useState("");

  const canSubmit =
    teamId.trim() && teamName.trim() && botUserId.trim() && botToken.trim();

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
        onError: (err) =>
          toast.error(err.message || "Failed to register workspace"),
      }
    );
  };

  return (
    <div className="space-y-4 px-5 py-4">
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
        type="button"
        onClick={handleSubmit}
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
    </div>
  );
}
