/**
 * @file Tests for useOffChainRevoke
 * @description The off-chain revoke primitive throws on failure (no boolean to
 * ignore). These tests pin the failure-mode-to-error mapping derived from the
 * `api` client's typed `ApiError`s, the internal request timeout, the
 * injected-poll outcomes, and the success path.
 */

import { renderHook } from "@testing-library/react";

const { mockApiPost, mockShowLoading, mockShowSuccess, mockShowError, mockDismiss } = vi.hoisted(
  () => ({
    mockApiPost: vi.fn(),
    mockShowLoading: vi.fn(),
    mockShowSuccess: vi.fn(),
    mockShowError: vi.fn(),
    mockDismiss: vi.fn(),
  })
);

vi.mock("@/utilities/api/client", () => ({
  api: { post: mockApiPost },
}));

vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: vi.fn(() => ({
    showLoading: mockShowLoading,
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    dismiss: mockDismiss,
  })),
}));

import { useOffChainRevoke } from "@/hooks/useOffChainRevoke";
import { HttpError, NetworkError, RequestAborted } from "@/utilities/api/errors";
import { IndexingTimeoutError, OffChainRevokeError } from "@/utilities/errors";
import { RetryAbortedError, RetryConditionNotMetError } from "@/utilities/retries";

const UID = "0xdeadbeef" as `0x${string}`;
const CHAIN_ID = 42220;

const setup = () => {
  const { result } = renderHook(() => useOffChainRevoke());
  return result.current.performOffChainRevoke;
};

describe("useOffChainRevoke - performOffChainRevoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const endpointOpts = { endpoint: "/attestations/revoke", method: "POST" as const };

  it("throws API_ERROR with the server status and toasts the string message", async () => {
    // Server responded with an error status -> classified as HttpError.
    mockApiPost.mockRejectedValue(
      new HttpError(403, { ...endpointOpts, body: { message: "Forbidden" } })
    );
    const performOffChainRevoke = setup();

    await expect(performOffChainRevoke({ uid: UID, chainID: CHAIN_ID })).rejects.toMatchObject({
      code: "API_ERROR",
      status: 403,
      surfaced: true,
    });

    expect(mockShowError).toHaveBeenCalledWith("Forbidden");
  });

  it("throws REQUEST_FAILED and toasts the NORMALIZED string for a no-response network error", async () => {
    // No response: classified as NetworkError, original Error preserved on `cause`.
    mockApiPost.mockRejectedValue(
      new NetworkError({ ...endpointOpts, cause: new Error("Network Error") })
    );
    const performOffChainRevoke = setup();

    await expect(performOffChainRevoke({ uid: UID, chainID: CHAIN_ID })).rejects.toMatchObject({
      code: "REQUEST_FAILED",
      surfaced: true,
    });

    // Never pass a raw object to showError — only the normalized message string.
    expect(mockShowError).toHaveBeenCalledWith("Network Error");
    for (const call of mockShowError.mock.calls) {
      expect(typeof call[0]).toBe("string");
    }
  });

  it("maps an internal timeout abort to a REQUEST_FAILED 'timed out' error", async () => {
    // AbortSignal.timeout fires -> axios re-wraps the external-signal abort as a
    // CanceledError (name "CanceledError", code "ERR_CANCELED"), classified as
    // RequestAborted with the original error preserved on `cause`. Because this
    // hook owns the only signal, that is the internal request timeout, never
    // user cancellation.
    const abortError = Object.assign(new Error("canceled"), {
      name: "CanceledError",
      code: "ERR_CANCELED",
    });
    mockApiPost.mockRejectedValue(new RequestAborted({ ...endpointOpts, cause: abortError }));
    const performOffChainRevoke = setup();

    await expect(performOffChainRevoke({ uid: UID, chainID: CHAIN_ID })).rejects.toMatchObject({
      code: "REQUEST_FAILED",
      surfaced: true,
    });

    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining("timed out"));
  });

  it("passes an AbortSignal bound to the request timeout", async () => {
    mockApiPost.mockResolvedValue({ ok: true });
    const performOffChainRevoke = setup();

    await performOffChainRevoke({ uid: UID, chainID: CHAIN_ID });

    const args = mockApiPost.mock.calls[0];
    expect(args[2]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("maps injected-poll RetryConditionNotMetError to an IndexingTimeoutError with an actionable toast", async () => {
    mockApiPost.mockResolvedValue({ ok: true });
    const performOffChainRevoke = setup();

    await expect(
      performOffChainRevoke({
        uid: UID,
        chainID: CHAIN_ID,
        checkIfExists: () => Promise.reject(new RetryConditionNotMetError()),
      })
    ).rejects.toBeInstanceOf(IndexingTimeoutError);

    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining("indexed"));
  });

  it("rethrows a caller-owned poll cancellation untouched with NO toast", async () => {
    mockApiPost.mockResolvedValue({ ok: true });
    const performOffChainRevoke = setup();

    const abort = new RetryAbortedError();
    await expect(
      performOffChainRevoke({
        uid: UID,
        chainID: CHAIN_ID,
        checkIfExists: () => Promise.reject(abort),
      })
    ).rejects.toBe(abort);

    expect(mockShowError).not.toHaveBeenCalled();
    expect(mockDismiss).toHaveBeenCalled();
  });

  it("resolves and shows the success toast on the happy path", async () => {
    mockApiPost.mockResolvedValue({ ok: true });
    const performOffChainRevoke = setup();

    await expect(
      performOffChainRevoke({
        uid: UID,
        chainID: CHAIN_ID,
        checkIfExists: () => Promise.resolve(),
        toastMessages: { success: "Revoked!", loading: "Revoking..." },
      })
    ).resolves.toBeUndefined();

    expect(mockShowLoading).toHaveBeenCalledWith("Revoking...");
    expect(mockShowSuccess).toHaveBeenCalledWith("Revoked!");
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it("dismisses (no success toast) when no success message is provided", async () => {
    mockApiPost.mockResolvedValue({ ok: true });
    const performOffChainRevoke = setup();

    await performOffChainRevoke({ uid: UID, chainID: CHAIN_ID });

    expect(mockShowSuccess).not.toHaveBeenCalled();
    expect(mockDismiss).toHaveBeenCalled();
  });

  it("uses an injected toast instance instead of its own when provided", async () => {
    mockApiPost.mockResolvedValue({ ok: true });
    const injectedShowLoading = vi.fn();
    const injectedToast = {
      showLoading: injectedShowLoading,
      showSuccess: vi.fn(),
      showError: vi.fn(),
      dismiss: vi.fn(),
    } as unknown as ReturnType<typeof import("@/hooks/useAttestationToast").useAttestationToast>;

    const { result } = renderHook(() => useOffChainRevoke(injectedToast));
    await result.current.performOffChainRevoke({ uid: UID, chainID: CHAIN_ID });

    expect(injectedShowLoading).toHaveBeenCalled();
    expect(mockShowLoading).not.toHaveBeenCalled();
  });

  it("throws an OffChainRevokeError instance (not a plain Error) on API failure", async () => {
    mockApiPost.mockRejectedValue(
      new HttpError(400, { ...endpointOpts, body: { message: "Bad Request" } })
    );
    const performOffChainRevoke = setup();

    await expect(performOffChainRevoke({ uid: UID, chainID: CHAIN_ID })).rejects.toBeInstanceOf(
      OffChainRevokeError
    );
  });
});
