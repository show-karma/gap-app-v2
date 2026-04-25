"use client";

import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { SlackOAuthHandleAmbiguousError, useLinkSlackUser } from "@/hooks/useSlackOauth";
import type {
  SlackOAuthHandleCandidate,
  SlackOAuthLinkInput,
  SlackOAuthWorkspace,
} from "@/types/slack-oauth";
import { SlackOauthCandidatePicker } from "./SlackOauthCandidatePicker";
import { SlackOauthTextField } from "./SlackOauthTextField";

type LinkMode = "handle" | "memberId" | "email";

/**
 * Add-link form with three modes: handle, member ID, and email
 * resolve-missing. On 409 ambiguous handle, shows the candidate picker
 * so the admin can resolve without re-entering the form. All three
 * modes route through the same `linkByHandleOrMember` service method
 * which discriminates on the body shape (handle / slackUserId / email).
 *
 * Email mode is the resolve-missing CTA: the backend runs Slack's
 * `users.lookupByEmail` and persists an `EMAIL_LOOKUP`-tagged link on
 * hit. The auto-resolve path runs at dispatch-time anyway, but this
 * lets admins pre-warm the link before the first notification fires.
 */
export function SlackOauthAddLinkForm({
  workspace,
  communitySlug,
}: {
  workspace: SlackOAuthWorkspace;
  communitySlug: string;
}) {
  const { mutate, isPending } = useLinkSlackUser(communitySlug);
  const [mode, setMode] = useState<LinkMode>("handle");
  const [karmaUserId, setKarmaUserId] = useState("");
  const [value, setValue] = useState("");
  const [candidates, setCandidates] = useState<SlackOAuthHandleCandidate[]>([]);

  const resetForm = () => {
    setKarmaUserId("");
    setValue("");
    setCandidates([]);
  };

  const buildInput = (slackUserIdOverride?: string): SlackOAuthLinkInput => {
    if (slackUserIdOverride) {
      // Candidate-picker resolves an ambiguous handle by giving us a
      // canonical slackUserId — short-circuit the mode entirely.
      return {
        karmaUserId: karmaUserId.trim(),
        slackUserId: slackUserIdOverride,
      };
    }
    if (mode === "handle") {
      return { karmaUserId: karmaUserId.trim(), handle: value.trim() };
    }
    if (mode === "email") {
      return { karmaUserId: karmaUserId.trim(), email: value.trim() };
    }
    return { karmaUserId: karmaUserId.trim(), slackUserId: value.trim() };
  };

  const submit = (slackUserIdOverride?: string) => {
    mutate(buildInput(slackUserIdOverride), {
      onSuccess: () => {
        toast.success("User linked");
        resetForm();
      },
      onError: (err) => {
        if (err instanceof SlackOAuthHandleAmbiguousError) {
          setCandidates([...err.candidates]);
          // Use a regular .success-styled call (lucide icon supplied
          // separately via custom render in the toast options would be
          // too heavy here). No emoji per project convention.
          toast(`${err.candidates.length} matches — pick one below`);
          return;
        }
        toast.error(err.message || "Link failed");
      },
    });
  };

  // Clear stale candidates whenever the inputs change. Without this,
  // editing `karmaUserId` after a 409 leaves the picker visible while
  // the inputs no longer match — confusing UX.
  const handleKarmaUserIdChange = (next: string) => {
    setKarmaUserId(next);
    if (candidates.length > 0) setCandidates([]);
  };
  const handleValueChange = (next: string) => {
    setValue(next);
    if (candidates.length > 0) setCandidates([]);
  };

  const canSubmit = karmaUserId.trim().length > 0 && value.trim().length > 0;

  // Wrap in a real <form> so Enter submits, browser autofill kicks in,
  // and screen readers announce the form region. Submit-type button
  // routes through onSubmit; mode toggle + candidate picks stay as
  // plain buttons (they're not the primary submit action).
  const handleSubmitEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit && !isPending) submit();
  };

  return (
    <form
      onSubmit={handleSubmitEvent}
      className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/40"
    >
      <LinkModeToggle
        mode={mode}
        onChange={(next) => {
          setMode(next);
          setCandidates([]);
        }}
      />

      <SlackOauthTextField
        label="Karma user ID"
        value={karmaUserId}
        onChange={handleKarmaUserIdChange}
        placeholder="user-id-or-wallet"
        disabled={isPending}
      />
      <SlackOauthTextField
        label={fieldLabel(mode)}
        value={value}
        onChange={handleValueChange}
        placeholder={fieldPlaceholder(mode)}
        disabled={isPending}
        type={mode === "email" ? "email" : "text"}
      />

      <Button type="submit" disabled={!canSubmit || isPending} aria-label="Link user">
        {isPending ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="mr-1.5 h-3.5 w-3.5" />
        )}
        Link
      </Button>

      {candidates.length > 0 ? (
        <SlackOauthCandidatePicker
          candidates={candidates}
          onPick={(slackUserId) => submit(slackUserId)}
          isSubmitting={isPending}
        />
      ) : null}

      <p className="text-[11px] text-stone-400 dark:text-zinc-500">
        Workspace: {workspace.teamName}
      </p>
    </form>
  );
}

function fieldLabel(mode: LinkMode): string {
  if (mode === "handle") return "Slack handle";
  if (mode === "memberId") return "Slack member ID";
  return "Email";
}

function fieldPlaceholder(mode: LinkMode): string {
  if (mode === "handle") return "@bruno";
  if (mode === "memberId") return "U01AB2CDEF";
  return "user@example.com";
}

function LinkModeToggle({
  mode,
  onChange,
}: {
  mode: LinkMode;
  onChange: (next: LinkMode) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <LinkModeButton
        active={mode === "handle"}
        onClick={() => onChange("handle")}
        label="By handle"
      />
      <LinkModeButton
        active={mode === "memberId"}
        onClick={() => onChange("memberId")}
        label="By member ID"
      />
      <LinkModeButton
        active={mode === "email"}
        onClick={() => onChange("email")}
        label="By email"
      />
    </div>
  );
}

function LinkModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1 font-medium ${
        active
          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
          : "text-stone-500 dark:text-zinc-400"
      }`}
    >
      {label}
    </button>
  );
}
