"use client";

import { CheckIcon } from "@heroicons/react/24/outline";
import { type FC, useState } from "react";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Button } from "@/components/Utilities/Button";
import {
  useDeleteSimocracyCredential,
  useSetSimocracyCredential,
} from "@/hooks/useApplicationIntegrations";
import type { ISimocracyIntegrationConfig } from "@/types/funding-platform";

export interface SimocracyCredentialSectionProps {
  programId: string;
  config?: ISimocracyIntegrationConfig;
}

export const SimocracyCredentialSection: FC<SimocracyCredentialSectionProps> = ({
  programId,
  config,
}) => {
  const setMutation = useSetSimocracyCredential(programId);
  const deleteMutation = useDeleteSimocracyCredential(programId);

  const configured = config?.credentialConfigured === true;
  const [editing, setEditing] = useState(false);
  const [appPassword, setAppPassword] = useState("");

  const showForm = editing || !configured;

  const handleSave = () => {
    setMutation.mutate(appPassword.trim(), {
      onSuccess: () => {
        setEditing(false);
        setAppPassword("");
      },
    });
  };

  return (
    <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">
            ATProto credential
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Used to publish each application as a proposal on the gathering account. Paste an app
            password for the account that hosts the gathering — Karma verifies it against that
            account automatically.
          </p>
        </div>
        {configured && !editing && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
            <CheckIcon className="h-3.5 w-3.5" />
            Connected
          </span>
        )}
      </div>

      {configured && !editing ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-zinc-900/60">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {config?.credentialIdentifier}
          </span>
          {config?.credentialDid && (
            <code
              className="truncate font-mono text-[11px] text-gray-500 dark:text-gray-400"
              title={config.credentialDid}
            >
              {config.credentialDid}
            </code>
          )}
          <span className="min-w-0 flex-1" />
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700"
          >
            Replace
          </button>
          <DeleteDialog
            title="Remove the stored ATProto credential? New applications will stop syncing proposals to Simocracy."
            deleteFunction={() => deleteMutation.mutateAsync()}
            isLoading={deleteMutation.isPending}
            buttonElement={{
              text: "Remove",
              icon: null,
              styleClass:
                "shrink-0 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800/50 dark:bg-zinc-800 dark:text-red-400 dark:hover:bg-red-900/20",
            }}
          />
        </div>
      ) : (
        showForm && (
          <div className="mt-2 space-y-2">
            <input
              type="password"
              value={appPassword}
              onChange={(event) => setAppPassword(event.target.value)}
              placeholder="App password (xxxx-xxxx-xxxx-xxxx)"
              spellCheck={false}
              autoComplete="off"
              aria-label="ATProto app password"
              className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-gray-700 dark:bg-zinc-900 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!appPassword.trim() || setMutation.isPending}
                isLoading={setMutation.isPending}
              >
                Verify &amp; save
              </Button>
              {configured && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setAppPassword("");
                  }}
                  disabled={setMutation.isPending}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
};
