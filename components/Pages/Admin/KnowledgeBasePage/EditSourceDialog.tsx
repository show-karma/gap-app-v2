"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { GitBranch, Lock, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { useEditKnowledgeSource } from "@/hooks/knowledge-base/useKnowledgeSourceMutations";
import { KnowledgeBaseApiError } from "@/services/knowledge-base.service";
import {
  KNOWLEDGE_SOURCE_KIND_HINTS,
  KNOWLEDGE_SOURCE_KIND_LABELS,
  type KnowledgeSource,
  type UpdateKnowledgeSourceInput,
} from "@/types/v2/knowledge-base";

/**
 * DEV-202: edit-mode dialog for an existing knowledge source. Distinct
 * from `AddSourceDialog` — kind is locked (changing kind is conceptually
 * a different source per ticket §"Not editable in v1"), and saves that
 * touch content-affecting fields (`goal`, `externalId`, follow-links
 * turn-on) prompt a confirmation describing the side effects before the
 * patch is sent. Display-only saves (title) commit directly.
 */

interface Props {
  communityIdOrSlug: string;
  source: KnowledgeSource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GOAL_MAX = 500;

export function EditSourceDialog({ communityIdOrSlug, source, open, onOpenChange }: Props) {
  const [title, setTitle] = useState("");
  const [externalId, setExternalId] = useState("");
  const [goal, setGoal] = useState("");
  const [followLinks, setFollowLinks] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const edit = useEditKnowledgeSource(communityIdOrSlug);

  // Hydrate from `source` only when the dialog opens or the row identity
  // changes (different sourceId). Depending on the source object reference
  // would re-fire on every cache update — including the optimistic patch
  // from `useEditKnowledgeSource.onMutate` — and on a 409 rollback the
  // effect would run twice and overwrite anything the curator typed
  // during the round-trip. Keying on `source?.id` keeps hydration tied
  // to "this is a different row" without coupling to identity churn.
  // biome-ignore lint/correctness/useExhaustiveDependencies: hydration is intentionally driven by row identity, not source-object reference; see comment above
  useEffect(() => {
    if (open && source) {
      setTitle(source.title);
      setExternalId(source.externalId);
      setGoal(source.goal ?? "");
      setFollowLinks(source.followLinks);
    }
    if (!open) {
      // Clear any in-flight confirmation modal when the parent closes —
      // otherwise re-opening on a different row could land on a stale
      // confirm step that was waiting on the previous edit.
      setConfirmOpen(false);
    }
  }, [open, source?.id]);

  const trimmedTitle = title.trim();
  const trimmedExternalId = externalId.trim();
  const trimmedGoal = goal.trim();

  // Tri-state goal: original null + empty string → no change, original
  // string + empty string → clear (null), original string + new string
  // → change. The patch matches this. Same logic mirrored on the
  // backend's `Object.prototype.hasOwnProperty.call(body, 'goal')` path.
  const goalForPatch: string | null | "unchanged" = useMemo(() => {
    if (!source) return "unchanged";
    const original = source.goal ?? "";
    if (trimmedGoal === original) return "unchanged";
    return trimmedGoal.length > 0 ? trimmedGoal : null;
  }, [source, trimmedGoal]);

  const changes = useMemo<EditChanges | null>(() => {
    if (!source) return null;
    return {
      titleChanged: trimmedTitle !== source.title && trimmedTitle.length > 0,
      goalChanged: goalForPatch !== "unchanged",
      externalIdChanged: trimmedExternalId !== source.externalId && trimmedExternalId.length > 0,
      followLinksTurnedOn: followLinks && !source.followLinks,
      followLinksTurnedOff: !followLinks && source.followLinks,
    };
  }, [source, trimmedTitle, goalForPatch, trimmedExternalId, followLinks]);

  const hasAnyChange = changes
    ? changes.titleChanged ||
      changes.goalChanged ||
      changes.externalIdChanged ||
      changes.followLinksTurnedOn ||
      changes.followLinksTurnedOff
    : false;

  const requiresConfirmation = changes
    ? changes.goalChanged || changes.externalIdChanged || changes.followLinksTurnedOn
    : false;

  const canSubmit =
    !!source &&
    hasAnyChange &&
    trimmedTitle.length > 0 &&
    trimmedExternalId.length > 0 &&
    !edit.isPending;

  const buildPatch = (): UpdateKnowledgeSourceInput | null => {
    if (!source || !changes) return null;
    const patch: UpdateKnowledgeSourceInput = {};
    if (changes.titleChanged) patch.title = trimmedTitle;
    if (changes.goalChanged) {
      // `changes.goalChanged` is defined as `goalForPatch !== "unchanged"`,
      // so by the time we're inside this branch goalForPatch is always
      // `string | null` — narrow it for the assignment.
      patch.goal = goalForPatch as string | null;
    }
    if (changes.externalIdChanged) patch.externalId = trimmedExternalId;
    if (changes.followLinksTurnedOn || changes.followLinksTurnedOff) {
      patch.followLinks = followLinks;
    }
    return patch;
  };

  const persist = async () => {
    if (!source) return;
    const patch = buildPatch();
    if (!patch || Object.keys(patch).length === 0) {
      onOpenChange(false);
      return;
    }
    try {
      await edit.mutateAsync({ sourceId: source.id, patch });
      toast.success(
        requiresConfirmation
          ? "Source updated. Re-sync queued — runs on the next worker tick."
          : "Source updated."
      );
      setConfirmOpen(false);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (isDuplicateExternalIdError(err)) {
        // Backend's `KnowledgeSourceAlreadyExistsException` (409) — show
        // a specific message so the curator immediately understands it's
        // a collision, not a transport failure. Leave the dialog open
        // so they can correct the URL in place.
        toast.error("That URL or ID is already registered for another source in this community.");
      } else {
        toast.error(message || "Failed to update source.");
      }
      setConfirmOpen(false);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (requiresConfirmation) {
      setConfirmOpen(true);
      return;
    }
    void persist();
  };

  if (!source) return null;

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 dark:bg-black/60" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl outline-none dark:border-zinc-800 dark:bg-zinc-950 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
            <div className="flex items-center gap-3 border-b border-stone-200 px-5 py-4 dark:border-zinc-800">
              <Dialog.Title className="text-[15px] font-semibold tracking-[-0.01em] text-stone-900 dark:text-zinc-100">
                Edit knowledge source
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="ml-auto rounded-md p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Update this knowledge source. Changes that affect ingestion will trigger a re-sync on
              the next worker tick.
            </Dialog.Description>

            <form
              className="contents"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <div className="flex-1 overflow-y-auto px-5 py-[18px]">
                <KindLockedBadge kind={source.kind} />

                <div className="mt-4 space-y-3.5">
                  <FormField
                    label="Title"
                    hint="Shown in the admin list and as the citation label in chat replies."
                    htmlFor="kb-edit-title"
                  >
                    <input
                      id="kb-edit-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={200}
                      className="h-9 w-full rounded-md border border-stone-300 bg-white px-3 text-[13px] text-stone-900 placeholder-stone-400 transition focus:border-sky-500 focus:outline-none focus:ring-[3px] focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-sky-400 dark:focus:ring-sky-400/20"
                    />
                  </FormField>

                  <FormField
                    label={
                      source.kind === "gdrive_file"
                        ? "Google Doc URL or ID"
                        : source.kind === "pdf_url"
                          ? "PDF URL"
                          : "Web page URL"
                    }
                    hint={
                      KNOWLEDGE_SOURCE_KIND_HINTS[source.kind] ??
                      "Provide a publicly-accessible URL."
                    }
                    htmlFor="kb-edit-external"
                  >
                    <input
                      id="kb-edit-external"
                      type="text"
                      value={externalId}
                      onChange={(e) => setExternalId(e.target.value)}
                      maxLength={2048}
                      spellCheck={false}
                      className="h-9 w-full rounded-md border border-stone-300 bg-white px-3 font-mono text-[12.5px] text-stone-900 placeholder-stone-400 transition focus:border-sky-500 focus:outline-none focus:ring-[3px] focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-600 dark:focus:border-sky-400 dark:focus:ring-sky-400/20"
                    />
                  </FormField>

                  <FormField
                    label="Purpose (optional)"
                    hint="One sentence on what this source is for. Prepended to each chunk at embed time so the chatbot ranks it higher when a question matches the intent. Editing this re-embeds every chunk under this source on the next sync."
                    htmlFor="kb-edit-goal"
                  >
                    <div className="relative">
                      <textarea
                        id="kb-edit-goal"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value.slice(0, GOAL_MAX))}
                        maxLength={GOAL_MAX}
                        rows={3}
                        className="block w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 pb-5 text-[13px] leading-relaxed text-stone-900 placeholder-stone-400 transition focus:border-sky-500 focus:outline-none focus:ring-[3px] focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-sky-400 dark:focus:ring-sky-400/20"
                      />
                      <span
                        aria-live="polite"
                        className="pointer-events-none absolute bottom-1.5 right-2 font-mono text-[10.5px] tabular-nums text-stone-400 dark:text-zinc-600"
                      >
                        {goal.length}/{GOAL_MAX}
                      </span>
                    </div>
                  </FormField>

                  {source.kind === "gdrive_file" && (
                    <FollowLinksToggle checked={followLinks} onChange={setFollowLinks} />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-5 py-3 dark:border-zinc-800">
                <Button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="bg-transparent text-stone-700 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmit}>
                  {edit.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmEditDialog
        open={confirmOpen}
        changes={changes}
        loading={edit.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void persist()}
      />
    </>
  );
}

interface EditChanges {
  titleChanged: boolean;
  goalChanged: boolean;
  externalIdChanged: boolean;
  followLinksTurnedOn: boolean;
  followLinksTurnedOff: boolean;
}

// ── Locked kind badge ───────────────────────────────────────────────────────
//
// Kind is intentionally not editable in v1 — switching from URL to gdrive_file
// is a different source. We surface the current kind so curators can confirm
// they opened the right row, and a small lock icon explains why it's read-only.

function KindLockedBadge({ kind }: { kind: KnowledgeSource["kind"] }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-[12px] text-stone-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
      <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="flex-1">
        Source type: <strong className="font-semibold">{KNOWLEDGE_SOURCE_KIND_LABELS[kind]}</strong>
      </span>
      <span className="font-mono text-[10.5px] uppercase tracking-wider text-stone-500 dark:text-zinc-500">
        Read-only
      </span>
    </div>
  );
}

// ── Confirmation modal ──────────────────────────────────────────────────────
//
// Renders a bullet list of the side effects the curator is about to commit to.
// Lives in this file because its copy and structure are tightly coupled to
// the edit-flow change taxonomy — pulling it into a generic primitive would
// require parameterizing the messaging anyway.

function ConfirmEditDialog({
  open,
  changes,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  changes: EditChanges | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const effects = useMemo(() => {
    if (!changes) return [] as string[];
    const items: string[] = [];
    if (changes.goalChanged) {
      items.push(
        "Re-embed every chunk under this source. The new purpose will be prepended to each chunk at embed time."
      );
    }
    if (changes.externalIdChanged) {
      items.push(
        "Re-fetch and re-index documents under the new URL/ID. For folder-style sources, documents that no longer match are soft-deleted on the next sync."
      );
    }
    if (changes.followLinksTurnedOn) {
      items.push(
        "Discover and ingest Google Docs linked from this one (one level deep) on the next sync."
      );
    }
    return items;
  }, [changes]);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-stone-950/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 dark:bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] flex w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl outline-none dark:border-zinc-800 dark:bg-zinc-950 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <div className="px-5 py-4">
            <div className="flex items-start gap-3">
              <div
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <Dialog.Title className="text-[14px] font-semibold tracking-[-0.01em] text-stone-900 dark:text-zinc-100">
                  Apply re-sync changes?
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-[12.5px] leading-relaxed text-stone-600 dark:text-zinc-400">
                  This edit changes how Karma ingests this source. The following will happen on the
                  next worker tick:
                </Dialog.Description>
                <ul className="mt-3 space-y-1.5 text-[12.5px] leading-relaxed text-stone-700 dark:text-zinc-300">
                  {effects.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span
                        aria-hidden="true"
                        className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-stone-400 dark:bg-zinc-600"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-5 py-3 dark:border-zinc-800">
            <Button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="bg-transparent text-stone-700 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button type="button" onClick={onConfirm} disabled={loading}>
              {loading ? "Applying…" : "Apply changes"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Follow-links toggle ─────────────────────────────────────────────────────
//
// Mirror of AddSourceDialog's toggle; duplicated rather than exported so the
// add/edit dialogs can diverge their hint copy if needed (edit's hint can
// reasonably warn that turning the flag on triggers discovery).

function FollowLinksToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/60">
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-[2px] h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-stone-300 text-sky-600 focus:ring-2 focus:ring-sky-500/40 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:ring-sky-400/40"
        />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-stone-800 dark:text-zinc-200">
            <GitBranch
              aria-hidden="true"
              className="h-3.5 w-3.5 text-stone-500 dark:text-zinc-500"
              strokeWidth={1.75}
            />
            Follow links to other Google Docs
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-stone-500 dark:text-zinc-500">
            Karma also ingests Google Docs linked from this one (one level deep). Turning this on
            triggers a discovery pass on the next sync. Turning it off leaves already-discovered
            docs in place.
          </p>
        </div>
      </label>
    </div>
  );
}

// ── Form field ──────────────────────────────────────────────────────────────

function FormField({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-zinc-400"
      >
        {label}
      </label>
      {children}
      <p className="mt-1.5 text-xs leading-relaxed text-stone-500 dark:text-zinc-500">{hint}</p>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Detect the backend's KnowledgeSourceAlreadyExistsException. Primary
 * signal is the HTTP status (409) carried on `KnowledgeBaseApiError`;
 * the message-substring fallback is defensive — if some intermediary
 * (e.g., a future `Error` re-throw) strips the structured class but
 * preserves the server's wording, we still detect the conflict and
 * show specific copy. Without the fallback a stripped status would
 * fall through to the generic "Failed to update" toast.
 */
function isDuplicateExternalIdError(err: unknown): boolean {
  if (err instanceof KnowledgeBaseApiError && err.status === 409) {
    return true;
  }
  if (err instanceof Error && err.message) {
    const lower = err.message.toLowerCase();
    return lower.includes("already") && lower.includes("registered");
  }
  return false;
}
