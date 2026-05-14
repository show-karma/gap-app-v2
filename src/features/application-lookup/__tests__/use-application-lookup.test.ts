import { act, renderHook, waitFor } from "@testing-library/react";
import fetchData from "@/utilities/fetchData";
import { useApplicationLookup } from "../hooks/use-application-lookup";

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn(),
}));

const mockFetchData = fetchData as unknown as vi.Mock;

const VALID_REFERENCE = "APP-ABCD1234-XYZ789";

const SUCCESS_PAYLOAD = {
  referenceNumber: VALID_REFERENCE,
  maskedEmail: "j***@example.com",
  maskedWallet: "0x12***7890",
  communityName: "Optimism",
  communitySlug: "optimism",
};

describe("useApplicationLookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authentication (regression guard for DEV-287)", () => {
    // The hook was originally introduced (2026-02-27, commit 79586d78) with
    // isAuthorized=false in the 6th positional arg to fetchData. The backend
    // route requires authentication, so logged-in users hit a JWT error. If
    // anyone flips this back to false, this test must fail loudly.
    it("forwards the JWT by calling fetchData with isAuthorized=true", async () => {
      mockFetchData.mockResolvedValue([SUCCESS_PAYLOAD, null]);

      const { result } = renderHook(() => useApplicationLookup());

      await act(async () => {
        await result.current.lookupApplication(VALID_REFERENCE);
      });

      expect(mockFetchData).toHaveBeenCalledTimes(1);
      const callArgs = mockFetchData.mock.calls[0];
      expect(callArgs[5]).toBe(true);
      expect(callArgs[5]).not.toBe(false);
    });

    it("calls the v2 lookup-credential endpoint with the reference number", async () => {
      mockFetchData.mockResolvedValue([SUCCESS_PAYLOAD, null]);

      const { result } = renderHook(() => useApplicationLookup());

      await act(async () => {
        await result.current.lookupApplication(VALID_REFERENCE);
      });

      expect(mockFetchData).toHaveBeenCalledWith(
        `/v2/funding-applications/lookup-credential/${VALID_REFERENCE}`,
        "GET",
        {},
        {},
        {},
        true
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

      expect(mockFetchData).not.toHaveBeenCalled();
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
      mockFetchData.mockResolvedValue([SUCCESS_PAYLOAD, null]);

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

    it("maps a backend error string into a not_found error", async () => {
      mockFetchData.mockResolvedValue([null, "Application not found"]);

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

    it("falls back to a generic not_found message when fetchError is not a string", async () => {
      mockFetchData.mockResolvedValue([null, null]);

      const { result } = renderHook(() => useApplicationLookup());

      await act(async () => {
        await result.current.lookupApplication(VALID_REFERENCE);
      });

      expect(result.current.error).toEqual({
        type: "not_found",
        message: `Funding application with reference number ${VALID_REFERENCE} not found`,
      });
    });

    it("surfaces a network_error when fetchData throws", async () => {
      mockFetchData.mockRejectedValue(new Error("boom"));

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
      mockFetchData.mockResolvedValue([SUCCESS_PAYLOAD, null]);

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
