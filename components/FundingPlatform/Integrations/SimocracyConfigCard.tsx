"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { type FC, useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/Utilities/Button";
import { useUpdateSimocracyIntegration } from "@/hooks/useApplicationIntegrations";
import { useProgramConfig } from "@/hooks/useFundingPlatform";
import { cn } from "@/utilities/tailwind";

const gatheringUriSchema = z
  .string()
  .trim()
  .min(1, "Gathering AT-URI is required")
  .max(512, "AT-URI is too long")
  .regex(/^at:\/\//, "Must be an AT-URI starting with at://");

export interface SimocracyConfigCardProps {
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

export const SimocracyConfigCard: FC<SimocracyConfigCardProps> = ({ programId, canEdit }) => {
  const { data: program, isLoading, error, refetch } = useProgramConfig(programId);
  const updateMutation = useUpdateSimocracyIntegration(programId);

  const saved = program?.applicationConfig?.integrations?.simocracy;

  const [enabled, setEnabled] = useState(false);
  const [gatheringUri, setGatheringUri] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Seed the form from the saved config once it arrives (and re-seed after an
  // external refetch changes it). Keyed on the saved values, not the object
  // identity, so optimistic cache writes don't wipe in-progress edits.
  useEffect(() => {
    setEnabled(saved?.enabled ?? false);
    setGatheringUri(saved?.gatheringUri ?? "");
  }, [saved?.enabled, saved?.gatheringUri]);

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

  const isDirty =
    enabled !== (saved?.enabled ?? false) || gatheringUri.trim() !== (saved?.gatheringUri ?? "");

  const handleSave = () => {
    const parsed = gatheringUriSchema.safeParse(gatheringUri);
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid AT-URI");
      return;
    }
    setValidationError(null);
    updateMutation.mutate({ gatheringUri: parsed.data, enabled });
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Simocracy</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Run funding rounds through a council of Sims on ATProto. When enabled, sim evaluations
            appear on each application.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle Simocracy integration"
          onClick={() => setEnabled((value) => !value)}
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

      <div className="mt-4">
        <label
          htmlFor="simocracy-gathering-uri"
          className="block text-xs font-medium text-gray-700 dark:text-gray-300"
        >
          Gathering AT-URI
        </label>
        <input
          id="simocracy-gathering-uri"
          type="text"
          value={gatheringUri}
          onChange={(event) => {
            setGatheringUri(event.target.value);
            if (validationError) setValidationError(null);
          }}
          disabled={!canEdit || updateMutation.isPending}
          placeholder="at://did:plc:…/org.simocracy.gathering/…"
          spellCheck={false}
          aria-invalid={!!validationError}
          className={cn(
            "mt-1 block w-full rounded-md border bg-white dark:bg-zinc-900 px-3 py-2 font-mono text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60",
            validationError
              ? "border-red-400 dark:border-red-700"
              : "border-gray-200 dark:border-gray-700"
          )}
        />
        {validationError ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
            {validationError}
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            The Simocracy gathering this program's rounds run in.
          </p>
        )}
      </div>

      {canEdit && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!isDirty || updateMutation.isPending}
            isLoading={updateMutation.isPending}
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
};
