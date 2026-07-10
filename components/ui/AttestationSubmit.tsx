"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { Button } from "@/components/Utilities/Button";
import type { SignerStatus } from "@/utilities/wallet/signerReadiness";

interface AttestationSubmitBaseProps {
  /**
   * Signing readiness (see `useSetupChainAndWallet().signerStatus`):
   * - `no-wallet` → render a "Connect wallet" CTA instead of the submit button.
   * - `initializing` → submit button disabled with a tooltip.
   * - `ready` → normal submit (disabled only when `disabled` / `isLoading`).
   */
  signerStatus: SignerStatus;
  /** Disable submit for reasons other than signer readiness (e.g. invalid form). */
  disabled?: boolean;
  /** Show the spinner and block submit while the attestation is in flight. */
  isLoading?: boolean;
  /** Called when the user clicks the "Connect wallet" CTA (no-wallet state). */
  onConnectWallet: () => void;
  /** Submit button label, e.g. "Create Milestone", "Post Update". */
  label: ReactNode;
  /** CTA label for the no-wallet state. Defaults to "Connect wallet". */
  connectLabel?: ReactNode;
  /**
   * Tooltip shown while submit is blocked (invalid form / initializing signer).
   * Defaults to a wallet-preparing message while `initializing`.
   */
  tooltipContent?: ReactNode;
  /** Optional className override for both the submit button and the CTA. */
  className?: string;
}

/**
 * `type="button"` REQUIRES `onSubmit` (there's no surrounding `<form>` to
 * submit to). The default `type="submit"` must NOT take one. This discriminated
 * union makes a `type="button"` with no handler a compile error instead of a
 * silent clickable no-op — the exact bug class #1821 is about.
 */
type AttestationSubmitProps = AttestationSubmitBaseProps &
  ({ type?: "submit"; onSubmit?: never } | { type: "button"; onSubmit: () => void });

const DEFAULT_BUTTON_CLASSNAME =
  "flex flex-row items-center justify-center gap-2 rounded-md bg-brand-blue px-6 py-2 text-md font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

/**
 * Generalized submit region for any attestation flow. Mirrors the
 * ProjectDialog's `ProjectSubmitControls` (GAP-FRONTEND-24N) without the
 * project-specific copy so every write/attestation flow can gate its submit on
 * `signerStatus` the same way:
 *
 * - `no-wallet` → "Connect wallet" CTA (never a silent no-op).
 * - `initializing` → clickable "Preparing…" state. The wallet is still being
 *   provisioned, but the button stays enabled: clicking auto-proceeds and the
 *   signer's bounded wait resolves it — no "try again" retry for the user.
 * - `ready` → normal submit, disabled only by `disabled`/`isLoading`.
 */
export function AttestationSubmit({
  signerStatus,
  disabled = false,
  isLoading = false,
  onConnectWallet,
  label,
  connectLabel = "Connect wallet",
  tooltipContent,
  type = "submit",
  onSubmit,
  className = DEFAULT_BUTTON_CLASSNAME,
}: AttestationSubmitProps) {
  if (signerStatus === "no-wallet") {
    return (
      <Button type="button" className={className} onClick={() => onConnectWallet()}>
        {connectLabel}
      </Button>
    );
  }

  // While the wallet finishes provisioning, show a "Preparing…" state but keep
  // the button clickable — clicking auto-proceeds (the signer waits) instead of
  // forcing a manual retry. Only the real in-flight submit / an invalid form
  // blocks it.
  const preparing = signerStatus === "initializing" && !isLoading;
  const isSubmitBlocked = disabled || isLoading;
  const resolvedTooltip = tooltipContent ?? null;

  const button = (
    <Button
      type={type}
      className={className}
      disabled={isSubmitBlocked}
      isLoading={isLoading || preparing}
      onClick={type === "button" ? onSubmit : undefined}
    >
      {preparing ? "Preparing…" : label}
    </Button>
  );

  // Only wrap in a tooltip when there is something to say and submit is blocked.
  if (!resolvedTooltip || !isSubmitBlocked) {
    return button;
  }

  return (
    <Tooltip.Provider>
      <Tooltip.Root delayDuration={0}>
        <Tooltip.Trigger asChild>
          <div className="flex w-max h-max">{button}</div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="TooltipContent bg-brand-darkblue rounded-lg text-white p-3 z-[1000]"
            sideOffset={5}
            side="bottom"
          >
            {resolvedTooltip}
            <Tooltip.Arrow className="TooltipArrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
