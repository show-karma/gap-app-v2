/**
 * MSW integration tests for the donor-persona hooks (DEV-431, U6).
 *
 * The service layer uses `fetchData` (axios → indexer base URL), which MSW's
 * node interceptors patch in jsdom. We mock TokenManager so the auth header
 * attaches without a real Privy session.
 */

import { QueryClient } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react";
import { donorHandleQueryKey, useDonorHandle, useUpdateDonorHandle } from "@/hooks/useDonorHandles";
import {
  donorPersonaQueryKey,
  useDonorPersona,
  useRefineDonorPersona,
  useUpdateDonorPersona,
} from "@/hooks/useDonorPersona";
import { DonorPersonaRateLimitError } from "@/services/donor-research.service";
import type { DonorPersona } from "@/types/donor-research";
import {
  donorResearchHandlers,
  donorResearchRateLimitHandlers,
  makeDonorPersona,
} from "../../msw/handlers/donor-research.handlers";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

/**
 * A query client whose cache is NOT garbage-collected when a query has no
 * active observer — required for the mutation-only optimistic tests below,
 * which read `getQueryData` directly without mounting the query hook.
 */
function persistentQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Number.POSITIVE_INFINITY,
        staleTime: Number.POSITIVE_INFINITY,
      },
      mutations: { retry: false },
    },
  });
}

installMswLifecycle();

const HANDLE_ID = "handle-001";

describe("useDonorPersona (query)", () => {
  it("returns the persona on success", async () => {
    const { result } = renderHookWithProviders(() => useDonorPersona(HANDLE_ID));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe("persona-001");
    expect(result.current.data?.computedWeights.impactRecency).toBe(3000);
  });

  it("maps a 404 (no persona) to data: null, not an error", async () => {
    server.use(...donorResearchHandlers({ persona: null }));
    const { result } = renderHookWithProviders(() => useDonorPersona(HANDLE_ID));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it("does not fetch when handleId is falsy", () => {
    const { result } = renderHookWithProviders(() => useDonorPersona(null));
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useUpdateDonorPersona (optimistic)", () => {
  it("optimistically writes onto a null cache (first save), then the server response replaces it", async () => {
    const qc = persistentQueryClient();
    const key = donorPersonaQueryKey(HANDLE_ID);
    qc.setQueryData<DonorPersona | null>(key, null);

    const { result } = renderHookWithProviders(() => useUpdateDonorPersona(HANDLE_ID), {
      queryClient: qc,
    });

    result.current.mutate({ sourceText: "Brand new source notes" });

    // Optimistic projection lands on the previously-null cache.
    await waitFor(() => {
      expect(qc.getQueryData<DonorPersona>(key)?.sourceText).toBe("Brand new source notes");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Server response (recomputed weights, real id) replaces the optimistic value.
    expect(qc.getQueryData<DonorPersona>(key)?.id).toBe("persona-001");
  });

  it("rolls back to the persona snapshot on a 429 and surfaces an actionable rate-limit error", async () => {
    server.use(...donorResearchRateLimitHandlers());
    const qc = persistentQueryClient();
    const key = donorPersonaQueryKey(HANDLE_ID);
    const original = makeDonorPersona({ sourceText: "Original source" });
    qc.setQueryData<DonorPersona | null>(key, original);

    const { result } = renderHookWithProviders(() => useUpdateDonorPersona(HANDLE_ID), {
      queryClient: qc,
    });

    result.current.mutate({ sourceText: "Edited but will be rejected" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // Cache restored to the exact pre-mutation snapshot.
    expect(qc.getQueryData<DonorPersona>(key)?.sourceText).toBe("Original source");
    // Error is the typed, channel-specific rate-limit error.
    expect(result.current.error).toBeInstanceOf(DonorPersonaRateLimitError);
    expect((result.current.error as DonorPersonaRateLimitError).channel).toBe("persona_write");
  });
});

describe("useRefineDonorPersona", () => {
  it("returns the non-persisted refinement result", async () => {
    const { result } = renderHookWithProviders(() => useRefineDonorPersona(HANDLE_ID));
    result.current.mutate("Some long-enough source text for refine");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.structured.orgMaturity.source).toBe("extracted");
  });

  it("surfaces a channel-specific error on a 429", async () => {
    server.use(...donorResearchRateLimitHandlers());
    const { result } = renderHookWithProviders(() => useRefineDonorPersona(HANDLE_ID));
    result.current.mutate("Some long-enough source text for refine");
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as DonorPersonaRateLimitError).channel).toBe("persona_refine");
  });
});

describe("useDonorHandle / useUpdateDonorHandle", () => {
  it("fetches a single handle", async () => {
    const { result } = renderHookWithProviders(() => useDonorHandle(HANDLE_ID));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.opaqueLabel).toBe("Riverside Family Foundation");
  });

  it("optimistically updates notes then commits the server value", async () => {
    const qc = persistentQueryClient();
    const key = donorHandleQueryKey(HANDLE_ID);
    qc.setQueryData(key, {
      id: HANDLE_ID,
      advisorId: "advisor-001",
      opaqueLabel: "Riverside Family Foundation",
      notes: "old notes",
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: "2026-06-18T10:00:00.000Z",
    });

    const { result } = renderHookWithProviders(() => useUpdateDonorHandle(HANDLE_ID), {
      queryClient: qc,
    });

    result.current.mutate({ notes: "fresh notes" });

    await waitFor(() => {
      expect(qc.getQueryData<{ notes: string }>(key)?.notes).toBe("fresh notes");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
