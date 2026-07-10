"use client";

import * as Sentry from "@sentry/nextjs";
import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { errorManager } from "@/components/Utilities/errorManager";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import {
  isSignerUnavailableError,
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

export type UseAttestationResult<TVars, TData> = UseMutationResult<TData, unknown, TVars> & {
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
      if (signerStatus !== "ready") {
        Sentry.addBreadcrumb({
          category: "attestation",
          level: "warning",
          message: `Attestation submit attempted while signer not ready (${action})`,
          data: { signerStatus },
        });
        throw new SignerUnavailableError(
          signerStatus === "no-wallet" ? "no-wallet-connected" : "wallets-hydrating"
        );
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
      errorManager(`Failed to ${action}`, error);
      showError(`Failed to ${action}`);
    },
  });

  return Object.assign(mutation, {
    signerStatus,
    attestationAddress: smartWalletAddress,
  });
}
