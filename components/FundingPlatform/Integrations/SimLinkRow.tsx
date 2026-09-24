"use client";

import {
  ChevronDownIcon,
  ClipboardDocumentIcon,
  CpuChipIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { type FC, memo, useState } from "react";
import { DeleteDialog } from "@/components/DeleteDialog";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { Button as UiButton } from "@/components/ui/button";
import { useSimocracySimPersona } from "@/hooks/useApplicationIntegrations";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import type {
  SimocracyCouncilSim,
  SimocracySimLink,
} from "@/services/fundingApplicationIntegrations.service";
import { shortAddress } from "@/utilities/shortAddress";
import { cn } from "@/utilities/tailwind";
import { type ReviewerOption, truncateMiddle } from "./sim-link.shared";

interface SimLinkRowProps {
  programId: string;
  link: SimocracySimLink;
  sim?: SimocracyCouncilSim;
  reviewer?: ReviewerOption;
  canDelete: boolean;
  isDeleting: boolean;
  onDelete: (simUri: string) => Promise<void>;
}

export const SimLinkRow: FC<SimLinkRowProps> = memo(function SimLinkRow({
  programId,
  link,
  sim,
  reviewer,
  canDelete,
  isDeleting,
  onDelete,
}) {
  const [, copy] = useCopyToClipboard();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false);
  const {
    data: persona,
    isLoading: isPersonaLoading,
    isError: isPersonaError,
  } = useSimocracySimPersona(programId, link.simUri, { enabled: personaOpen });
  const name = sim?.simName ?? null;

  return (
    <li className="flex flex-col px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {reviewer?.name || shortAddress(link.publicAddress)}
          </p>
          {reviewer?.email && (
            <p
              className="truncate text-xs text-gray-500 dark:text-gray-400"
              title={link.publicAddress}
            >
              {reviewer.email}
            </p>
          )}
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-2.5 sm:w-72">
          {sim?.avatar ? (
            <ProfilePicture
              imageURL={sim.avatar}
              name={name ?? link.simUri}
              size="28"
              className="h-7 w-7 rounded-md [image-rendering:pixelated]"
              alt=""
            />
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500 dark:bg-zinc-700 dark:text-gray-400">
              <CpuChipIcon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            {name && (
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{name}</p>
            )}
            <div className="flex items-center gap-1.5">
              <span
                className="truncate font-mono text-xs text-gray-500 dark:text-gray-400"
                title={link.simUri}
              >
                {truncateMiddle(link.simUri, 18, 10)}
              </span>
              <UiButton
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Copy sim AT-URI"
                onClick={() => copy(link.simUri, "Sim AT-URI copied")}
                className="shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <ClipboardDocumentIcon className="h-3.5 w-3.5" />
              </UiButton>
            </div>
            <UiButton
              type="button"
              variant="link"
              size="sm"
              onClick={() => setPersonaOpen((open) => !open)}
              aria-expanded={personaOpen}
              className="mt-1 w-fit gap-1 h-auto p-0 text-xs font-medium text-gray-500 hover:text-gray-900 hover:no-underline dark:text-gray-400 dark:hover:text-white"
            >
              <ChevronDownIcon
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-150 motion-reduce:transition-none",
                  personaOpen && "rotate-180"
                )}
              />
              Constitution &amp; Style
            </UiButton>
          </div>
        </div>

        {canDelete && (
          <>
            <UiButton
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove link for ${name ?? link.simUri}`}
              onClick={() => setIsDeleteOpen(true)}
              disabled={isDeleting}
              className="shrink-0 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
            >
              <TrashIcon className="h-4 w-4" />
            </UiButton>
            <DeleteDialog
              title={`Remove the link between ${reviewer?.name || shortAddress(link.publicAddress)} and ${name ?? truncateMiddle(link.simUri)}?`}
              deleteFunction={() => onDelete(link.simUri)}
              isLoading={isDeleting}
              buttonElement={null}
              externalIsOpen={isDeleteOpen}
              externalSetIsOpen={setIsDeleteOpen}
            />
          </>
        )}
      </div>

      {personaOpen && (
        <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
          {isPersonaLoading ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">Loading…</p>
          ) : isPersonaError ? (
            <p className="text-xs text-red-500 dark:text-red-400">
              Couldn&apos;t load the persona from Simocracy.
            </p>
          ) : (
            <>
              <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900/40">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Constitution</p>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                  {persona?.constitution ?? "Not set on Simocracy."}
                </p>
              </div>
              <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900/40">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Style</p>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                  {persona?.style ?? "Not set on Simocracy."}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
});
