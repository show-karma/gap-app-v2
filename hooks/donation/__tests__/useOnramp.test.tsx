import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { donationsService } from "@/services/donations.service";
import { OnrampError, OnrampErrorCode } from "../onramp-errors";
import { OnrampProvider } from "../types";
import { useOnramp } from "../useOnramp";

jest.mock("react-hot-toast");
jest.mock("@/services/donations.service");

const mockDonationsService = donationsService as jest.Mocked<typeof donationsService>;
const mockToast = toast as jest.Mocked<typeof toast>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const defaultParams = {
  projectUid: "project-123",
  payoutAddress: "0x1234567890123456789012345678901234567890",
  network: "base",
  targetAsset: "USDC",
  provider: OnrampProvider.STRIPE,
};

describe("useOnramp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("returns correct initial state", () => {
      const { result } = renderHook(() => useOnramp(defaultParams), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.session).toBeNull();
      expect(typeof result.current.initiateOnramp).toBe("function");
      expect(typeof result.current.clearSession).toBe("function");
    });
  });

  describe("initiateOnramp", () => {
    it("creates session successfully", async () => {
      const mockResponse = {
        sessionToken: "cs_test_123",
        sessionId: "session-123",
        donationUid: "donation-456",
        expiresAt: "2024-01-01T00:00:00Z",
      };

      mockDonationsService.createOnrampSession.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useOnramp(defaultParams), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.initiateOnramp(100, "USD");
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.session).toEqual({
        clientSecret: "cs_test_123",
        donationUid: "donation-456",
      });
      expect(result.current.error).toBeNull();
      expect(mockDonationsService.createOnrampSession).toHaveBeenCalledWith({
        provider: OnrampProvider.STRIPE,
        projectUid: "project-123",
        payoutAddress: "0x1234567890123456789012345678901234567890",
        fiatAmount: 100,
        fiatCurrency: "USD",
        network: "base",
        targetAsset: "USDC",
        donorAddress: undefined,
      });
    });

    it("handles missing payout address", async () => {
      const onError = jest.fn();
      const { result } = renderHook(
        () =>
          useOnramp({
            ...defaultParams,
            payoutAddress: "",
            onError,
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.initiateOnramp(100, "USD");
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain("Payout address is required");
      expect(mockToast.error).toHaveBeenCalled();
      expect(onError).toHaveBeenCalled();
    });

    it("handles API error", async () => {
      const apiError = new Error("Network error");
      mockDonationsService.createOnrampSession.mockRejectedValueOnce(apiError);

      const onError = jest.fn();
      const { result } = renderHook(
        () =>
          useOnramp({
            ...defaultParams,
            onError,
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.initiateOnramp(100, "USD");
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.session).toBeNull();
      expect(mockToast.error).toHaveBeenCalled();
      expect(onError).toHaveBeenCalled();
    });

    it("handles OnrampError specifically", async () => {
      const onrampError = new OnrampError(
        OnrampErrorCode.SESSION_CREATION_FAILED,
        "Session creation failed",
        "Unable to start payment"
      );
      mockDonationsService.createOnrampSession.mockRejectedValueOnce(onrampError);

      const onError = jest.fn();
      const { result } = renderHook(
        () =>
          useOnramp({
            ...defaultParams,
            onError,
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.initiateOnramp(100, "USD");
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockToast.error).toHaveBeenCalledWith("Unable to start payment");
      expect(onError).toHaveBeenCalledWith(onrampError);
    });

    it("includes country in request when provided", async () => {
      const mockResponse = {
        sessionToken: "cs_test_123",
        sessionId: "session-123",
        donationUid: "donation-456",
        expiresAt: "2024-01-01T00:00:00Z",
      };

      mockDonationsService.createOnrampSession.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(
        () =>
          useOnramp({
            ...defaultParams,
            country: "US",
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.initiateOnramp(100, "USD");
      });

      await waitFor(() => {
        expect(result.current.session).not.toBeNull();
      });

      expect(mockDonationsService.createOnrampSession).toHaveBeenCalledWith(
        expect.objectContaining({
          country: "US",
        })
      );
    });
  });

  describe("clearSession", () => {
    it("resets session state", async () => {
      const mockResponse = {
        sessionToken: "cs_test_123",
        sessionId: "session-123",
        donationUid: "donation-456",
        expiresAt: "2024-01-01T00:00:00Z",
      };

      mockDonationsService.createOnrampSession.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useOnramp(defaultParams), {
        wrapper: createWrapper(),
      });

      // Create a session first
      act(() => {
        result.current.initiateOnramp(100, "USD");
      });

      await waitFor(() => {
        expect(result.current.session).not.toBeNull();
      });

      // Clear the session
      act(() => {
        result.current.clearSession();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe("default provider", () => {
    it("uses STRIPE as default provider when not specified", async () => {
      const mockResponse = {
        sessionToken: "cs_test_123",
        sessionId: "session-123",
        donationUid: "donation-456",
        expiresAt: "2024-01-01T00:00:00Z",
      };

      mockDonationsService.createOnrampSession.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(
        () =>
          useOnramp({
            projectUid: "project-123",
            payoutAddress: "0x1234567890123456789012345678901234567890",
            network: "base",
            targetAsset: "USDC",
            // provider not specified
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.initiateOnramp(100, "USD");
      });

      await waitFor(() => {
        expect(result.current.session).not.toBeNull();
      });

      expect(mockDonationsService.createOnrampSession).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: OnrampProvider.STRIPE,
        })
      );
    });
  });
});
