"use client";

import { ArrowDownTrayIcon, ArrowPathIcon, CheckIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import { type FC, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/Utilities/Button";
import { Button as UiButton } from "@/components/ui/button";
import {
  useExportSimocracyFeedback,
  useSimocracyCouncil,
  useUpdateSimocracyIntegration,
} from "@/hooks/useApplicationIntegrations";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useProgramConfig } from "@/hooks/useFundingPlatform";
import { cn } from "@/utilities/tailwind";
import { GatheringUriField } from "./GatheringUriField";
import { SimocracyCredentialSection } from "./SimocracyCredentialSection";

const GATHERING_AT_URI =
  /^at:\/\/did:[a-z]+:[a-zA-Z0-9._:%-]+\/org\.simocracy\.gathering\/[^/\s]+$/;
const SIMOCRACY_GATHERING_URL = /^https?:\/\/(?:www\.)?simocracy\.org\/c\/([^/\s]+)\/([^/\s?#]+)/i;

// Accept the Simocracy gathering URL an operator copies from the site and derive
// the AT-URI from it, so they don't have to hand-build it:
//   https://www.simocracy.org/c/<url-encoded-did>/<rkey> → at://<did>/org.simocracy.gathering/<rkey>
// A correct AT-URI passes through unchanged.
function normalizeGatheringUri(input: string): string {
  const trimmed = input.trim();
  const match = SIMOCRACY_GATHERING_URL.exec(trimmed);
  if (!match) return trimmed;
  return `at://${decodeURIComponent(match[1])}/org.simocracy.gathering/${match[2]}`;
}

const gatheringUriSchema = z
  .string()
  .trim()
  .min(1, "Gathering AT-URI is required")
  .max(512, "AT-URI is too long")
  .transform(normalizeGatheringUri)
  .refine((uri) => GATHERING_AT_URI.test(uri), {
    message:
      "Paste the gathering AT-URI (at://did:…/org.simocracy.gathering/<id>) or the Simocracy gathering URL (simocracy.org/c/<did>/<id>)",
  });

interface SimocracyConfigCardProps {
  programId: string;
  /** False for reviewers — the form renders read-only. */
  canEdit: boolean;
}

const ConfigSkeleton: FC = () => (
  <div
    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 p-5 space-y-4 animate-pulse"
    data-testid="simocracy-config-loading"
  >
    <div className="flex items-center justify-between">
      <div className="h-5 w-32 rounded bg-gray-200 dark:bg-zinc-700" />
      <div className="h-6 w-11 rounded-full bg-gray-200 dark:bg-zinc-700" />
    </div>
    <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-zinc-700" />
    <div className="h-9 w-full rounded bg-gray-100 dark:bg-zinc-700" />
  </div>
);

const FeedbackExportRow: FC<{ programId: string }> = ({ programId }) => {
  const exportFeedback = useExportSimocracyFeedback(programId);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3.5 dark:border-gray-700">
      <p className="max-w-[48ch] text-xs text-gray-500 dark:text-gray-400">
        Download the Sim evaluations and reviewer feedback for this program as a CSV.
      </p>
      <UiButton
        type="button"
        variant="outline"
        size="sm"
        onClick={() => exportFeedback.mutate()}
        disabled={exportFeedback.isPending}
        className="shrink-0 gap-1.5 text-xs"
      >
        <ArrowDownTrayIcon className="h-3.5 w-3.5" />
        {exportFeedback.isPending ? "Exporting…" : "Export feedback (CSV)"}
      </UiButton>
    </div>
  );
};

export const SimocracyConfigCard: FC<SimocracyConfigCardProps> = ({ programId, canEdit }) => {
  const { data: program, isLoading, error, refetch } = useProgramConfig(programId);
  const updateMutation = useUpdateSimocracyIntegration(programId);
  const [, copy] = useCopyToClipboard();

  const saved = program?.applicationConfig?.integrations?.simocracy;
  const savedUri = saved?.gatheringUri ?? "";
  const savedEnabled = saved?.enabled ?? false;

  // Drafts sit on top of the saved config; null means "not edited yet", so a
  // refetch changing the saved values flows through until the user types.
  const [draftEnabled, setDraftEnabled] = useState<boolean | null>(null);
  const [draftUri, setDraftUri] = useState<string | null>(null);
  const enabled = draftEnabled ?? savedEnabled;
  const gatheringUri = draftUri ?? savedUri;
  const [editingUri, setEditingUri] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: council } = useSimocracyCouncil(programId, {
    enabled: canEdit && savedEnabled && savedUri.length > 0,
  });

  if (isLoading) {
    return <ConfigSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 p-6 text-center">
        <p className="text-sm text-red-700 dark:text-red-400">
          Failed to load the program configuration.
        </p>
        <Button onClick={() => refetch()} className="mt-4 inline-flex items-center gap-2">
          <ArrowPathIcon className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const showUriInput = editingUri || savedUri.length === 0;

  const handleToggle = () => {
    const next = !enabled;
    setDraftEnabled(next);
    // A configured gathering saves the flip immediately; before the first URI
    // is set there is nothing valid to persist yet — Save does it.
    if (savedUri.length > 0) {
      updateMutation.mutate({ gatheringUri: savedUri, enabled: next });
    }
  };

  const handleSave = () => {
    const parsed = gatheringUriSchema.safeParse(gatheringUri);
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid AT-URI");
      return;
    }
    setValidationError(null);
    updateMutation.mutate(
      { gatheringUri: parsed.data, enabled },
      {
        onSuccess: () => {
          setEditingUri(false);
          setDraftUri(null);
        },
      }
    );
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Simocracy</h2>
          <p className="mt-0.5 max-w-[64ch] text-xs text-gray-500 dark:text-gray-400">
            Run funding rounds through a council of Sims on ATProto. When enabled, sim evaluations
            appear on each application.
          </p>
        </div>
        {/* design-check-ignore: DS005 accessible role="switch" toggle; the repo has no Switch primitive */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle Simocracy integration"
          onClick={handleToggle}
          disabled={!canEdit || updateMutation.isPending}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:focus:ring-offset-zinc-800",
            enabled ? "bg-blue-600" : "bg-gray-300 dark:bg-zinc-700"
          )}
        >
          <span
            className={cn(
              "pointer-events-none mt-0.5 inline-block h-5 w-5 rounded-full bg-white shadow-sm transition duration-200",
              enabled ? "translate-x-[22px]" : "translate-x-[2px]"
            )}
          />
        </button>
      </div>

      {enabled && (
        <>
          {savedUri.length > 0 && (
            <div className="mt-3.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
              {(council?.length ?? 0) > 0 && (
                <>
                  <span className="inline-flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                    <CheckIcon className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                    Gathering resolved
                  </span>
                  <span className="text-gray-300 dark:text-zinc-600">·</span>
                  <span>
                    {council?.length} {pluralize("sim", council?.length ?? 0)} in council
                  </span>
                </>
              )}
            </div>
          )}

          <GatheringUriField
            value={gatheringUri}
            savedUri={savedUri}
            editing={showUriInput}
            validationError={validationError}
            canEdit={canEdit}
            isPending={updateMutation.isPending}
            onChange={(value) => {
              setDraftUri(value);
              if (validationError) setValidationError(null);
            }}
            onSave={handleSave}
            onCancel={() => {
              setEditingUri(false);
              setDraftUri(null);
              setValidationError(null);
            }}
            onEdit={() => setEditingUri(true)}
            onCopy={() => copy(savedUri, "Gathering AT-URI copied")}
          />

          {canEdit && savedUri.length > 0 && (
            <>
              <SimocracyCredentialSection programId={programId} config={saved} />
              <FeedbackExportRow programId={programId} />
            </>
          )}
        </>
      )}
    </div>
  );
};
