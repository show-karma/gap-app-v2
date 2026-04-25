"use client";

import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import {
  SlackOAuthHandleAmbiguousError,
  useLinkSlackUser,
} from "@/hooks/useSlackOauth";
import type {
  SlackOAuthHandleCandidate,
  SlackOAuthLinkInput,
  SlackOAuthWorkspace,
} from "@/types/slack-oauth";
import { SlackOauthCandidatePicker } from "./SlackOauthCandidatePicker";
import { SlackOauthTextField } from "./SlackOauthTextField";

type LinkMode = "handle" | "memberId";

/**
 * Add-link form with handle/member-id mode toggle. On 409 ambiguous
 * handle, shows the candidate picker so the admin can resolve without
 * re-entering the form. The mode toggle is a cheap UX: both paths go
 * through the same `linkByHandleOrMember` service method which
 * discriminates on the body shape.
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

  const buildInput = (
    slackUserIdOverride?: string
  ): SlackOAuthLinkInput => {
    if (mode === "handle" && !slackUserIdOverride) {
      return { karmaUserId: karmaUserId.trim(), handle: value.trim() };
    }
    return {
      karmaUserId: karmaUserId.trim(),
      slackUserId: slackUserIdOverride ?? value.trim(),
    };
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
        label={mode === "handle" ? "Slack handle" : "Slack member ID"}
        value={value}
        onChange={handleValueChange}
        placeholder={mode === "handle" ? "@bruno" : "U01AB2CDEF"}
        disabled={isPending}
      />

      <Button
        type="submit"
        disabled={!canSubmit || isPending}
        aria-label="Link user"
      >
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

function LinkModeToggle({
  mode,
  onChange,
}: {
  mode: LinkMode;
  onChange: (next: LinkMode) => void;
}) {
  return (
    <div className="flex gap-2 text-xs">
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
