"use client";

import * as Sentry from "@sentry/nextjs";
import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { errorManager } from "@/components/Utilities/errorManager";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import {
  isSignerUnavailableError,
  isUserRejectionError,
  type SignerStatus,
  SignerUnavailableError,
} from "@/utilities/wallet/signerReadiness";

interface UseAttestationParams<TVars, TData> {
  /**
   * Entity-specific attestation work: switch chain, build the SDK entity,
   * `.attest(...)`, notify the indexer, and poll. Runs ONLY when the signer is
   * ready — the readiness gate + breadcrumb + typed error are handled here.
   */
  attest: (variables: TVars) => Promise<TData>;
  /**
   * Human-readable action, e.g. `"create milestone"`. Used in the Sentry
   * breadcrumb and the fallback error toast (`Failed to ${action}`).
   */
  action: string;
  /** Surface a message to the user (typically `useAttestationToast().showError`). */
  showError: (message: string) => void;
  /** Called on success with the `attest()` result. */
  onSuccess?: (data: TData, variables: TVars) => void | Promise<void>;
  /**
   * Extra handling for the expected "no wallet ready to sign" case beyond the
   * default guidance toast — e.g. reopening a dialog with the form preserved.
   */
  onSignerUnavailable?: (error: SignerUnavailableError) => void;
}

type UseAttestationResult<TVars, TData> = UseMutationResult<TData, unknown, TVars> & {
  /** Signing readiness for gating the submit control (see `AttestationSubmit`). */
  signerStatus: SignerStatus;
  /** The address that will sign (embedded/external wallet), never wagmi's. */
  attestationAddress: string | null;
};

/**
 * Shared spine for every write/attestation flow (GAP-FRONTEND-24N generalized,
 * issue #1821). Wraps the guard → attest → feedback sequence in a single React
 * Query `useMutation` so that:
 *
 * 1. The submit is gated on the **signing identity** (`signerStatus`), never on
 *    wagmi `useAccount().address` — which lags the Privy signer and produced the
 *    silent no-op this hook exists to kill.
 * 2. A submit while the wallet isn't ready throws a typed `SignerUnavailableError`
 *    (an expected lifecycle state) and leaves a Sentry breadcrumb, instead of
 *    returning silently.
 * 3. `SignerUnavailableError` is routed to user guidance and kept out of Sentry;
 *    every other error goes through `errorManager` (Sentry) + a toast.
 *
 * Consumers own their entity-specific `attest` body and success toasts; this hook
 * owns readiness, error routing, and the "always `useMutation`" compliance.
 */
export function useAttestation<TVars = void, TData = unknown>({
  attest,
  action,
  showError,
  onSuccess,
  onSignerUnavailable,
}: UseAttestationParams<TVars, TData>): UseAttestationResult<TVars, TData> {
  const { signerStatus, smartWalletAddress } = useSetupChainAndWallet();

  const mutation = useMutation<TData, unknown, TVars>({
    mutationFn: async (variables: TVars) => {
      // "initializing" is the brief window while Privy/the embedded wallet is
      // still provisioning. Don't block the user with a "try again" — proceed
      // and let getAttestationSigner's bounded wait (waitForUsableWallet, ~8s)
      // resolve it, so a click during provisioning auto-completes instead of
      // forcing a manual retry. If the wait times out, getAttestationSigner
      // throws a typed SignerUnavailableError, routed to guidance below.
      // Only a genuinely absent wallet is blocked up front.
      if (signerStatus === "no-wallet") {
        Sentry.addBreadcrumb({
          category: "attestation",
          level: "warning",
          message: `Attestation submit attempted with no connected wallet (${action})`,
          data: { signerStatus },
        });
        throw new SignerUnavailableError("no-wallet-connected");
      }
      return attest(variables);
    },
    onSuccess,
    onError: (error) => {
      if (isSignerUnavailableError(error)) {
        // Expected wallet-lifecycle state — guidance only, never Sentry.
        showError(error.message);
        onSignerUnavailable?.(error);
        return;
      }
      // errorManager owns Sentry reporting (and stays silent for user
      // rejections). Route through it, then show the user toast — EXCEPT when
      // the user deliberately cancelled the signature, where errorManager is
      // silent and a "Failed to …" toast would be misleading.
      errorManager(`Failed to ${action}`, error);
      if (!isUserRejectionError(error)) {
        showError(`Failed to ${action}`);
      }
    },
  });

  return Object.assign(mutation, {
    signerStatus,
    attestationAddress: smartWalletAddress,
  });
}
