/**
 * Project analytics emitters — creation funnel, edits, and activity updates.
 *
 * The emit sites are a 1700-line dialog and a 1000-line form, both far over
 * their size budget, and an inline `track()` there drags its derivations along
 * with it: a word count, a changed-field diff, an error-code mapping. None of
 * that is the screen's job. Keeping it here means the dialog and the form each
 * call one named function, and the shape of a project event is defined once
 * rather than in whichever component happened to emit it.
 *
 * Every function here is fire-and-forget. `track()` never throws (see
 * `client.ts`), so no call site needs a guard.
 */

import { track } from "@/utilities/analytics/client";
import { toErrorCode } from "@/utilities/analytics/error-code";
import {
  changedProjectFields,
  currentProjectEditValues,
} from "@/utilities/analytics/project-edit-diff";

/** Stable surface id: the dialog is the app's only project-creation entry. */
const PROJECT_CREATE_ENTRY_POINT = "project_dialog";

/**
 * How long an update is, without sending the update itself. Length is the
 * signal the grantee-health report needs (are updates substantive or
 * one-liners); the prose is the project's own content and never leaves the app.
 */
const countWords = (text: string | undefined): number =>
  text ? text.trim().split(/\s+/).filter(Boolean).length : 0;

/**
 * Opens the creation funnel before the wallet is involved, so the drop-off
 * between "started a project" and "signed the attestation" is measurable.
 */
export function emitProjectCreateStarted(): void {
  track("project_create_started", { entry_point: PROJECT_CREATE_ENTRY_POINT });
}

export function emitProjectCreateCompleted(projectUid: string, chainId: number): void {
  track("project_create_completed", {
    project_id: projectUid,
    chain_id: chainId,
    has_grants_prefilled: false,
  });
}

export function emitProjectCreateFailed(chainId: number | null | undefined, error: unknown): void {
  track("project_create_failed", { chain_id: chainId ?? null, error_code: toErrorCode(error) });
}

/**
 * A snapshot of the editable fields, to be diffed after the save.
 *
 * Taken BEFORE the update: `updateProject` calls `details.setValues(...)` on the
 * project object itself, so a diff computed afterwards is always empty.
 */
export function projectEditSnapshot(project: Parameters<typeof currentProjectEditValues>[0]) {
  return currentProjectEditValues(project);
}

/**
 * Field NAMES only — the values are the project's own content and have no place
 * on an event. An edit that changed nothing is not an edit, so a diff with no
 * entries emits nothing at all.
 */
type SubmittedProjectFields = Parameters<typeof changedProjectFields>[1];

export function emitProjectEdited(
  projectUid: string,
  snapshot: ReturnType<typeof currentProjectEditValues>,
  details: SubmittedProjectFields,
  socials: SubmittedProjectFields
): void {
  const fieldsChanged = changedProjectFields(snapshot, { ...details, ...socials });
  if (fieldsChanged.length === 0) return;
  track("project_edited", { project_id: projectUid, fields_changed: fieldsChanged });
}

export function emitProjectUpdatePosted(
  projectUid: string,
  deliverables: readonly unknown[] | undefined,
  text: string | undefined
): void {
  track("project_update_posted", {
    project_id: projectUid,
    has_deliverables: (deliverables?.length ?? 0) > 0,
    word_count: countWords(text),
  });
}

export function emitProjectUpdateFailed(projectUid: string | undefined, error: unknown): void {
  track("project_update_failed", { project_id: projectUid ?? "", error_code: toErrorCode(error) });
}
