"use client";

import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { Button } from "@/components/Utilities/Button";
import { Button as UiButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utilities/tailwind";

interface GatheringUriFieldProps {
  value: string;
  savedUri: string;
  editing: boolean;
  validationError: string | null;
  canEdit: boolean;
  isPending: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onCopy: () => void;
}

/** Gathering AT-URI editor: the saved value with copy/change, or the input with save/cancel. */
export const GatheringUriField: FC<GatheringUriFieldProps> = ({
  value,
  savedUri,
  editing,
  validationError,
  canEdit,
  isPending,
  onChange,
  onSave,
  onCancel,
  onEdit,
  onCopy,
}) => (
  <>
    <div className="mt-3">
      <label
        htmlFor="simocracy-gathering-uri"
        className="block text-xs font-medium text-gray-700 dark:text-gray-300"
      >
        Gathering AT-URI
      </label>
      {editing ? (
        <div className="mt-1 flex gap-2">
          <Input
            id="simocracy-gathering-uri"
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={!canEdit || isPending}
            placeholder="at://did:plc:…/org.simocracy.gathering/…"
            spellCheck={false}
            aria-invalid={!!validationError}
            className={cn(
              "min-w-0 flex-1 font-mono",
              validationError && "border-red-400 dark:border-red-700"
            )}
          />
          {canEdit && (
            <>
              <Button
                variant="primary"
                onClick={onSave}
                disabled={isPending}
                isLoading={isPending}
                className="shrink-0"
              >
                Save
              </Button>
              {savedUri.length > 0 && (
                <UiButton
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isPending}
                  className="shrink-0 text-gray-600 dark:text-gray-300"
                >
                  Cancel
                </UiButton>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="mt-1 flex h-[38px] items-center gap-2 rounded-md border border-gray-200 bg-gray-50 pl-3 pr-2 dark:border-gray-700 dark:bg-zinc-900/60">
          <code
            className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xsm text-gray-600 dark:text-gray-300"
            title={savedUri}
          >
            {savedUri}
          </code>
          <UiButton
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Copy gathering AT-URI"
            onClick={onCopy}
            className="shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
          </UiButton>
          {canEdit && (
            <UiButton
              type="button"
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-7 shrink-0 text-xs font-medium text-gray-600 dark:text-gray-300"
            >
              Change
            </UiButton>
          )}
        </div>
      )}
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
  </>
);
