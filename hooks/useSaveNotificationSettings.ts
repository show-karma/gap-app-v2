import { useQueryClient } from "@tanstack/react-query";
import type { MutableRefObject } from "react";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  type CommunityConfig,
  type TelegramChat,
  useCommunityConfigMutation,
} from "@/hooks/useCommunityConfig";

/**
 * Per-channel saved-state baseline used for dirty-detection. The page mirrors
 * these refs in its own state so the user's edits don't get clobbered by
 * sibling-mutation invalidations (see commit a17bed6b).
 */
export interface NotificationSaveBaselines {
  telegram: MutableRefObject<{ enabled: boolean; chats: TelegramChat[] }>;
  slack: MutableRefObject<{ enabled: boolean; urls: string[] }>;
}

export interface NotificationChannelState {
  telegram: { enabled: boolean; chats: TelegramChat[]; dirty: boolean };
  slack: { enabled: boolean; urls: string[]; dirty: boolean };
}

interface UseSaveNotificationSettingsArgs {
  slug: string;
  state: NotificationChannelState;
  baselines: NotificationSaveBaselines;
  /** Updaters allow the hook to reconcile state on success/failure paths. */
  setTgEnabled: (next: boolean) => void;
  setTgChats: (next: TelegramChat[]) => void;
  setSlackEnabled: (next: boolean) => void;
  setSlackUrls: (next: string[]) => void;
}

interface UseSaveNotificationSettingsResult {
  save: () => Promise<void>;
  isSaving: boolean;
  dirtyCount: number;
}

/**
 * Encapsulates the global "Save notification settings" workflow:
 * - Snapshots the payload up-front so async settling can't race with edits
 * - Fires per-channel mutations in parallel with allSettled
 * - Re-syncs baselines + local state to the authoritative payload on success
 * - Reconciles failed channels against fresh server data via cache invalidation
 *
 * Extracted from NotificationSettingsPage to keep the page component thin
 * (review feedback: 75-line save handler in a component is awkward).
 */
export function useSaveNotificationSettings({
  slug,
  state,
  baselines,
  setTgEnabled,
  setTgChats,
  setSlackEnabled,
  setSlackUrls,
}: UseSaveNotificationSettingsArgs): UseSaveNotificationSettingsResult {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useCommunityConfigMutation();

  const dirtyCount = (state.telegram.dirty ? 1 : 0) + (state.slack.dirty ? 1 : 0);

  const save = useCallback(async () => {
    if (dirtyCount === 0) return;

    // Snapshot the values we're about to send so we can re-sync baselines
    // against the exact payload below (state may change while async settles).
    const tgPayload = { enabled: state.telegram.enabled, chats: state.telegram.chats };
    const slackPayload = { enabled: state.slack.enabled, urls: state.slack.urls };

    type SaveOutcome = { kind: "TELEGRAM" | "SLACK"; ok: boolean; error?: string };

    const tasks: Promise<SaveOutcome>[] = [];

    if (state.telegram.dirty) {
      tasks.push(
        mutateAsync({
          slug,
          config: { telegramEnabled: tgPayload.enabled, telegramChats: tgPayload.chats },
        }).then(
          (): SaveOutcome => ({ kind: "TELEGRAM", ok: true }),
          (err: Error): SaveOutcome => ({
            kind: "TELEGRAM",
            ok: false,
            error: err.message || "Failed",
          })
        )
      );
    }

    if (state.slack.dirty) {
      tasks.push(
        mutateAsync({
          slug,
          config: {
            slackEnabled: slackPayload.enabled,
            slackWebhookUrls: slackPayload.urls,
          },
        }).then(
          (): SaveOutcome => ({ kind: "SLACK", ok: true }),
          (err: Error): SaveOutcome => ({
            kind: "SLACK",
            ok: false,
            error: err.message || "Failed",
          })
        )
      );
    }

    const results = await Promise.allSettled(tasks);

    let successCount = 0;
    const failures: string[] = [];
    const failedKinds: Array<"TELEGRAM" | "SLACK"> = [];

    for (const r of results) {
      // Inner promises always resolve (we map both fulfilled+rejected to
      // SaveOutcome above), so r.status is effectively always "fulfilled".
      // Defensive branch for the rejected case keeps TS happy.
      if (r.status === "fulfilled") {
        if (r.value.ok) {
          successCount += 1;
          // Re-sync baselines + local state to the now-authoritative values.
          // Compare against the snapshotted payload, NOT current state, so the
          // next dirty-check is accurate even if the user kept typing.
          if (r.value.kind === "TELEGRAM") {
            baselines.telegram.current = {
              enabled: tgPayload.enabled,
              chats: tgPayload.chats,
            };
            setTgChats(tgPayload.chats.length > 0 ? tgPayload.chats : [{ id: "", name: "" }]);
          } else {
            baselines.slack.current = {
              enabled: slackPayload.enabled,
              urls: slackPayload.urls,
            };
            setSlackUrls(slackPayload.urls.length > 0 ? slackPayload.urls : [""]);
          }
        } else {
          failures.push(`${r.value.kind}: ${r.value.error || "Failed"}`);
          failedKinds.push(r.value.kind);
        }
      } else {
        failures.push(r.reason?.message || "Unknown error");
      }
    }

    // Reconcile failed channels against server truth.
    //
    // The page intentionally never syncs from props on re-render (commit
    // a17bed6b — protects unsaved edits from sibling-mutation invalidations).
    // BUT: on partial failure, the failed channel's local state has diverged
    // from the server (the optimistic update in useCommunityConfigMutation's
    // onError already rolled back the cache, but our local component state
    // and baseline still reflect what we tried to send). Without this
    // reconcile, the user has no way back to consistency without a page
    // reload.
    //
    // We only reset the channels that FAILED, because the channels the user
    // is no longer editing are the only ones safe to overwrite — preserves
    // the clobber-fix.
    if (failedKinds.length > 0) {
      const queryKey = ["community-config", slug];
      await queryClient.invalidateQueries({ queryKey });
      const fresh = queryClient.getQueryData<CommunityConfig | null>(queryKey);
      if (fresh) {
        if (failedKinds.includes("TELEGRAM")) {
          const freshChats = fresh.telegramChats ?? [];
          baselines.telegram.current = {
            enabled: fresh.telegramEnabled ?? false,
            chats: freshChats,
          };
          setTgEnabled(fresh.telegramEnabled ?? false);
          setTgChats(freshChats.length > 0 ? freshChats : [{ id: "", name: "" }]);
        }
        if (failedKinds.includes("SLACK")) {
          const freshUrls = fresh.slackWebhookUrls ?? [];
          baselines.slack.current = {
            enabled: fresh.slackEnabled ?? false,
            urls: freshUrls,
          };
          setSlackEnabled(fresh.slackEnabled ?? false);
          setSlackUrls(freshUrls.length > 0 ? freshUrls : [""]);
        }
      }
    }

    if (successCount > 0 && failures.length === 0) {
      toast.success(
        successCount === 1 ? "Notification settings saved" : `${successCount} channels saved`
      );
    } else if (successCount > 0 && failures.length > 0) {
      toast.error(`Saved with errors: ${failures.join("; ")}`);
    } else {
      toast.error(`Save failed: ${failures.join("; ")}`);
    }
  }, [
    dirtyCount,
    slug,
    state.telegram.dirty,
    state.telegram.enabled,
    state.telegram.chats,
    state.slack.dirty,
    state.slack.enabled,
    state.slack.urls,
    baselines.telegram,
    baselines.slack,
    mutateAsync,
    queryClient,
    setTgEnabled,
    setTgChats,
    setSlackEnabled,
    setSlackUrls,
  ]);

  return { save, isSaving: isPending, dirtyCount };
}
