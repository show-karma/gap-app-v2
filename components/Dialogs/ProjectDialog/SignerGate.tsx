"use client";

import { ChevronRightIcon } from "@heroicons/react/24/solid";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { isSignerUnavailableError } from "@/utilities/wallet/signerReadiness";

/** Signing readiness for UI gating — mirrors useSetupChainAndWallet's signerStatus. */
type SignerStatus = "initializing" | "ready" | "no-wallet";

interface SignerErrorHandlerDeps {
  showError: (message: string) => void;
  setShouldResetOnOpen: (value: boolean) => void;
  openModal: () => void;
}

/**
 * Returns a handler for the "no wallet was ready to sign" case
 * (GAP-FRONTEND-24N). This is an expected user/lifecycle state — wallet still
 * hydrating, embedded wallet provisioning, or none connected — not a defect.
 * The handler shows actionable guidance, reopens the dialog with the form data
 * preserved, and skips errorManager/Sentry entirely.
 *
 * @returns `true` when the error was a SignerUnavailableError and has been
 *   handled (caller should `return`), `false` otherwise (caller keeps its
 *   normal error handling).
 */
export function useSignerErrorHandler({
  showError,
  setShouldResetOnOpen,
  openModal,
}: SignerErrorHandlerDeps) {
  return function handleSignerError(error: unknown): boolean {
    if (!isSignerUnavailableError(error)) return false;
    showError(error.message);
    setShouldResetOnOpen(false);
    openModal();
    return true;
  };
}

interface ProjectSubmitControlsProps {
  /** Only render on the final wizard step. */
  isLastStep: boolean;
  signerStatus: SignerStatus;
  hasErrors: boolean;
  isLoading: boolean;
  /** True when editing an existing project (vs. creating a new one). */
  isUpdate: boolean;
  onConnectWallet: () => void;
  tooltipContent: ReactNode;
}

const SUBMIT_BUTTON_CLASSNAME =
  "flex disabled:opacity-50 flex-row dark:bg-zinc-900 hover:text-white dark:text-white gap-2 items-center justify-center rounded-md border border-transparent bg-black px-6 py-2 text-md font-medium text-white hover:opacity-70 hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

/**
 * Final-step submit region. When the signer is unavailable (no wallet), it
 * surfaces a "Connect wallet" CTA instead of the submit button; while the
 * signer is still initializing, the submit button is disabled with a tooltip.
 */
export function ProjectSubmitControls({
  isLastStep,
  signerStatus,
  hasErrors,
  isLoading,
  isUpdate,
  onConnectWallet,
  tooltipContent,
}: ProjectSubmitControlsProps) {
  if (!isLastStep) return null;

  if (signerStatus === "no-wallet") {
    return (
      <Button type="button" className={SUBMIT_BUTTON_CLASSNAME} onClick={() => onConnectWallet()}>
        Connect wallet
      </Button>
    );
  }

  // While the wallet finishes provisioning, keep the button clickable and show a
  // "Preparing…" state — clicking auto-proceeds (the signer waits) instead of
  // making the user wait and retry. Only form errors / an in-flight submit block.
  const preparing = signerStatus === "initializing" && !isLoading;
  const isSubmitBlocked = hasErrors || isLoading;

  return (
    <Tooltip.Provider>
      <Tooltip.Root delayDuration={0}>
        <Tooltip.Trigger asChild>
          <div className="flex w-max h-max">
            <Button type="submit" className={SUBMIT_BUTTON_CLASSNAME} disabled={isSubmitBlocked}>
              {preparing ? "Preparing…" : isUpdate ? "Update project" : "Create project"}
              {!isUpdate && !preparing ? <ChevronRightIcon className="w-4 h-4" /> : null}
            </Button>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          {isSubmitBlocked ? (
            <Tooltip.Content
              className="TooltipContent bg-brand-darkblue rounded-lg text-white p-3 z-[1000]"
              sideOffset={5}
              side="bottom"
            >
              {tooltipContent}
              <Tooltip.Arrow className="TooltipArrow" />
            </Tooltip.Content>
          ) : null}
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
