import { act, renderHook, waitFor } from "@testing-library/react";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { useApplicationLookup } from "../hooks/use-application-lookup";

vi.mock("@/utilities/api/client", () => ({
  api: { get: vi.fn() },
}));

const mockApiGet = api.get as unknown as vi.Mock;

const VALID_REFERENCE = "APP-ABCD1234-XYZ789";

const SUCCESS_PAYLOAD = {
  referenceNumber: VALID_REFERENCE,
  maskedEmail: "j***@example.com",
  maskedWallet: "0x12***7890",
  communityName: "Optimism",
  communitySlug: "optimism",
};

const httpError = (status: number, message?: string) =>
  new HttpError(status, {
    endpoint: `/v2/funding-applications/lookup-credential/${VALID_REFERENCE}`,
    method: "GET",
    body: message ? { message } : undefined,
  });

describe("useApplicationLookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authentication (regression guard for DEV-287)", () => {
    // The hook was originally introduced (2026-02-27, commit 79586d78) with
    // isAuthorized=false in the 6th positional arg to fetchData. The backend
    // route requires authentication, so logged-in users hit a JWT error. If
    // anyone flips this back to false, this test must fail loudly.
    it("forwards the JWT by calling api.get with isAuthorized=true", async () => {
      mockApiGet.mockResolvedValue(SUCCESS_PAYLOAD);

      const { result } = renderHook(() => useApplicationLookup());

      await act(async () => {
        await result.current.lookupApplication(VALID_REFERENCE);
      });

      expect(mockApiGet).toHaveBeenCalledTimes(1);
      const callArgs = mockApiGet.mock.calls[0];
      expect(callArgs[1]?.isAuthorized).toBe(true);
      expect(callArgs[1]?.isAuthorized).not.toBe(false);
    });

    it("calls the v2 lookup-credential endpoint with the reference number", async () => {
      mockApiGet.mockResolvedValue(SUCCESS_PAYLOAD);

      const { result } = renderHook(() => useApplicationLookup());

      await act(async () => {
        await result.current.lookupApplication(VALID_REFERENCE);
      });

      expect(mockApiGet).toHaveBeenCalledWith(
        `/v2/funding-applications/lookup-credential/${VALID_REFERENCE}`,
        { isAuthorized: true }
      );
    });
  });

  describe("reference number validation", () => {
    it.each([
      ["empty string", ""],
      ["missing APP prefix", "ABCD1234-XYZ789"],
      ["lowercase characters", "APP-abcd1234-xyz789"],
      ["wrong segment lengths", "APP-ABCD123-XYZ789"],
      ["extra trailing chars", "APP-ABCD1234-XYZ7890"],
    ])("rejects %s without contacting the backend", async (_label, badInput) => {
      const { result } = renderHook(() => useApplicationLookup());

      await act(async () => {
        await result.current.lookupApplication(badInput);
      });

      expect(mockApiGet).not.toHaveBeenCalled();
      expect(result.current.error).toEqual({
        type: "invalid_format",
        message: expect.stringContaining("Invalid reference number format"),
      });
      expect(result.current.result).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("result handling", () => {
    it("populates result on success", async () => {
      mockApiGet.mockResolvedValue(SUCCESS_PAYLOAD);

      const { result } = renderHook(() => useApplicationLookup());

      await act(async () => {
        await result.current.lookupApplication(VALID_REFERENCE);
      });

      await waitFor(() => {
        expect(result.current.result).toEqual(SUCCESS_PAYLOAD);
      });
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it("maps a backend HTTP error into a not_found error", async () => {
      mockApiGet.mockRejectedValue(httpError(404, "Application not found"));

      const { result } = renderHook(() => useApplicationLookup());

      await act(async () => {
        await result.current.lookupApplication(VALID_REFERENCE);
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toEqual({
        type: "not_found",
        message: "Application not found",
      });
      expect(result.current.isLoading).toBe(false);
    });

    it("falls back to a generic not_found message when the response is empty", async () => {
      mockApiGet.mockResolvedValue(null);

      const { result } = renderHook(() => useApplicationLookup());

      await act(async () => {
        await result.current.lookupApplication(VALID_REFERENCE);
      });

      expect(result.current.error).toEqual({
        type: "not_found",
        message: `Funding application with reference number ${VALID_REFERENCE} not found`,
      });
    });

    it("surfaces a network_error when api.get throws a non-HTTP error", async () => {
      mockApiGet.mockRejectedValue(new Error("boom"));

      const { result } = renderHook(() => useApplicationLookup());

      await act(async () => {
        await result.current.lookupApplication(VALID_REFERENCE);
      });

      expect(result.current.error).toEqual({
        type: "network_error",
        message: expect.stringContaining("Unable to lookup application"),
      });
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("reset", () => {
    it("clears result, error, and loading state", async () => {
      mockApiGet.mockResolvedValue(SUCCESS_PAYLOAD);

      const { result } = renderHook(() => useApplicationLookup());

      await act(async () => {
        await result.current.lookupApplication(VALID_REFERENCE);
      });

      expect(result.current.result).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
