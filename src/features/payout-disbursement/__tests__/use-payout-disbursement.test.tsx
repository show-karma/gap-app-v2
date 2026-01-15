import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import * as payoutService from "../services/payout-disbursement.service";
import type {
  CreateDisbursementsRequest,
  PaginatedDisbursementsResponse,
  PayoutDisbursement,
} from "../types/payout-disbursement";
import { PayoutDisbursementStatus } from "../types/payout-disbursement";
import {
  payoutDisbursementKeys,
  useAwaitingSignaturesDisbursements,
  useCreateDisbursements,
  usePayoutHistory,
  usePendingDisbursements,
  useRecordSafeTransaction,
  useTotalDisbursed,
  useUpdateDisbursementStatus,
} from "../hooks/use-payout-disbursement";

jest.mock("../services/payout-disbursement.service");

const mockPayoutService = payoutService as jest.Mocked<typeof payoutService>;

describe("usePayoutDisbursement hooks", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const createMockDisbursement = (
    overrides: Partial<PayoutDisbursement> = {}
  ): PayoutDisbursement => ({
    id: "disbursement-123",
    grantUID: "grant-uid-456",
    projectUID: "project-uid-789",
    communityUID: "community-uid-abc",
    chainID: 10,
    safeAddress: "0x1234567890123456789012345678901234567890",
    safeTransactionHash: null,
    disbursedAmount: "1000000000",
    token: "USDC",
    tokenAddress: "0xA0b86a54A7e6B8E8E4C1e3a8e1f0f8e9e8e7e6e5",
    payoutAddress: "0xRecipient1234567890123456789012345678",
    milestoneBreakdown: null,
    status: PayoutDisbursementStatus.PENDING,
    executedAt: null,
    createdBy: "0xAdminAddress1234567890123456789012345",
    createdAt: "2026-01-13T10:00:00.000Z",
    updatedAt: "2026-01-13T10:00:00.000Z",
    ...overrides,
  });

  const createMockPaginatedResponse = (
    disbursements: PayoutDisbursement[] = [],
    pagination: Partial<PaginatedDisbursementsResponse["pagination"]> = {}
  ): PaginatedDisbursementsResponse => ({
    payload: disbursements,
    pagination: {
      totalCount: disbursements.length,
      page: 1,
      limit: 10,
      totalPages: 1,
      nextPage: null,
      prevPage: null,
      hasNextPage: false,
      hasPrevPage: false,
      ...pagination,
    },
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("usePayoutHistory", () => {
    it("should fetch payout history for a grant", async () => {
      const mockDisbursements = [
        createMockDisbursement({ status: PayoutDisbursementStatus.DISBURSED }),
        createMockDisbursement({ id: "disbursement-2", status: PayoutDisbursementStatus.PENDING }),
      ];
      const mockResponse = createMockPaginatedResponse(mockDisbursements);
      mockPayoutService.getPayoutHistory.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePayoutHistory("grant-uid-456"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPayoutService.getPayoutHistory).toHaveBeenCalledWith(
        "grant-uid-456",
        undefined,
        undefined
      );
      expect(result.current.data?.payload).toEqual(mockDisbursements);
      expect(result.current.error).toBeNull();
    });

    it("should support pagination parameters", async () => {
      const mockResponse = createMockPaginatedResponse([], { page: 2, limit: 5 });
      mockPayoutService.getPayoutHistory.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePayoutHistory("grant-uid-456", 2, 5), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPayoutService.getPayoutHistory).toHaveBeenCalledWith("grant-uid-456", 2, 5);
    });

    it("should not fetch when grantUID is empty", () => {
      const { result } = renderHook(() => usePayoutHistory(""), {
        wrapper,
      });

      expect(mockPayoutService.getPayoutHistory).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("should respect enabled option", () => {
      const { result } = renderHook(
        () => usePayoutHistory("grant-uid-456", undefined, undefined, { enabled: false }),
        { wrapper }
      );

      expect(mockPayoutService.getPayoutHistory).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("useTotalDisbursed", () => {
    it("should fetch total disbursed amount for a grant", async () => {
      mockPayoutService.getTotalDisbursed.mockResolvedValue("5000000000");

      const { result } = renderHook(() => useTotalDisbursed("grant-uid-456"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPayoutService.getTotalDisbursed).toHaveBeenCalledWith("grant-uid-456");
      expect(result.current.data).toBe("5000000000");
    });

    it("should not fetch when grantUID is empty", () => {
      const { result } = renderHook(() => useTotalDisbursed(""), {
        wrapper,
      });

      expect(mockPayoutService.getTotalDisbursed).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("usePendingDisbursements", () => {
    it("should fetch pending disbursements for a community", async () => {
      const mockDisbursements = [
        createMockDisbursement({ status: PayoutDisbursementStatus.PENDING }),
      ];
      const mockResponse = createMockPaginatedResponse(mockDisbursements);
      mockPayoutService.getPendingDisbursements.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePendingDisbursements("community-uid-abc"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPayoutService.getPendingDisbursements).toHaveBeenCalledWith(
        "community-uid-abc",
        undefined,
        undefined
      );
      expect(result.current.data?.payload).toHaveLength(1);
      expect(result.current.data?.payload[0].status).toBe(PayoutDisbursementStatus.PENDING);
    });

    it("should not fetch when communityUID is empty", () => {
      const { result } = renderHook(() => usePendingDisbursements(""), {
        wrapper,
      });

      expect(mockPayoutService.getPendingDisbursements).not.toHaveBeenCalled();
    });
  });

  describe("useAwaitingSignaturesDisbursements", () => {
    it("should fetch awaiting signatures disbursements for a Safe", async () => {
      const mockDisbursements = [
        createMockDisbursement({
          status: PayoutDisbursementStatus.AWAITING_SIGNATURES,
          safeTransactionHash: "0xsafetxhash123",
        }),
      ];
      const mockResponse = createMockPaginatedResponse(mockDisbursements);
      mockPayoutService.getAwaitingSignaturesDisbursements.mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useAwaitingSignaturesDisbursements("0x1234567890123456789012345678901234567890"),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPayoutService.getAwaitingSignaturesDisbursements).toHaveBeenCalledWith(
        "0x1234567890123456789012345678901234567890",
        undefined,
        undefined
      );
      expect(result.current.data?.payload[0].status).toBe(
        PayoutDisbursementStatus.AWAITING_SIGNATURES
      );
    });
  });

  describe("useCreateDisbursements", () => {
    it("should create disbursements successfully", async () => {
      const mockRequest: CreateDisbursementsRequest = {
        grants: [
          {
            grantUID: "grant-uid-456",
            projectUID: "project-uid-789",
            amount: "1000000000",
            payoutAddress: "0xRecipient1234567890123456789012345678",
          },
        ],
        communityUID: "community-uid-abc",
        chainID: 10,
        safeAddress: "0x1234567890123456789012345678901234567890",
        token: "USDC",
        tokenAddress: "0xA0b86a54A7e6B8E8E4C1e3a8e1f0f8e9e8e7e6e5",
      };

      const mockDisbursements = [createMockDisbursement()];
      mockPayoutService.createDisbursements.mockResolvedValue(mockDisbursements);

      const { result } = renderHook(() => useCreateDisbursements(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(mockRequest);
      });

      expect(mockPayoutService.createDisbursements).toHaveBeenCalledWith(mockRequest);
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it("should handle creation errors", async () => {
      const mockRequest: CreateDisbursementsRequest = {
        grants: [],
        communityUID: "community-uid-abc",
        chainID: 10,
        safeAddress: "0x1234567890123456789012345678901234567890",
        token: "USDC",
        tokenAddress: "0xA0b86a54A7e6B8E8E4C1e3a8e1f0f8e9e8e7e6e5",
      };

      mockPayoutService.createDisbursements.mockRejectedValue(new Error("Validation failed"));

      const { result } = renderHook(() => useCreateDisbursements(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync(mockRequest);
        } catch {
          // Expected error
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error?.message).toBe("Validation failed");
    });

    it("should call onSuccess callback when provided", async () => {
      const mockRequest: CreateDisbursementsRequest = {
        grants: [
          {
            grantUID: "grant-uid-456",
            projectUID: "project-uid-789",
            amount: "1000",
            payoutAddress: "0xRecipient",
          },
        ],
        communityUID: "community-uid-abc",
        chainID: 10,
        safeAddress: "0xSafeAddress",
        token: "USDC",
        tokenAddress: "0xTokenAddress",
      };

      const mockDisbursements = [createMockDisbursement()];
      mockPayoutService.createDisbursements.mockResolvedValue(mockDisbursements);

      const onSuccess = jest.fn();
      const { result } = renderHook(() => useCreateDisbursements({ onSuccess }), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(mockRequest);
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockDisbursements);
      });
    });
  });

  describe("useRecordSafeTransaction", () => {
    it("should record Safe transaction successfully", async () => {
      const mockUpdatedDisbursement = createMockDisbursement({
        status: PayoutDisbursementStatus.AWAITING_SIGNATURES,
        safeTransactionHash: "0xsafetxhash123",
      });
      mockPayoutService.recordSafeTransaction.mockResolvedValue(mockUpdatedDisbursement);

      const { result } = renderHook(() => useRecordSafeTransaction(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          disbursementId: "disbursement-123",
          request: {
            safeTransactionHash: "0xsafetxhash123",
            nonce: 42,
          },
        });
      });

      expect(mockPayoutService.recordSafeTransaction).toHaveBeenCalledWith("disbursement-123", {
        safeTransactionHash: "0xsafetxhash123",
        nonce: 42,
      });
      await waitFor(() => {
        expect(result.current.data?.status).toBe(PayoutDisbursementStatus.AWAITING_SIGNATURES);
      });
    });
  });

  describe("useUpdateDisbursementStatus", () => {
    it("should update status to DISBURSED", async () => {
      const mockUpdatedDisbursement = createMockDisbursement({
        status: PayoutDisbursementStatus.DISBURSED,
        executedAt: "2026-01-13T12:00:00.000Z",
      });
      mockPayoutService.updateDisbursementStatus.mockResolvedValue(mockUpdatedDisbursement);

      const { result } = renderHook(() => useUpdateDisbursementStatus(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          disbursementId: "disbursement-123",
          request: {
            status: PayoutDisbursementStatus.DISBURSED,
          },
        });
      });

      expect(mockPayoutService.updateDisbursementStatus).toHaveBeenCalledWith("disbursement-123", {
        status: PayoutDisbursementStatus.DISBURSED,
      });
      await waitFor(() => {
        expect(result.current.data?.status).toBe(PayoutDisbursementStatus.DISBURSED);
      });
    });

    it("should update status to FAILED with error message", async () => {
      const mockUpdatedDisbursement = createMockDisbursement({
        status: PayoutDisbursementStatus.FAILED,
      });
      mockPayoutService.updateDisbursementStatus.mockResolvedValue(mockUpdatedDisbursement);

      const { result } = renderHook(() => useUpdateDisbursementStatus(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          disbursementId: "disbursement-123",
          request: {
            status: PayoutDisbursementStatus.FAILED,
            errorMessage: "Transaction reverted",
          },
        });
      });

      expect(mockPayoutService.updateDisbursementStatus).toHaveBeenCalledWith("disbursement-123", {
        status: PayoutDisbursementStatus.FAILED,
        errorMessage: "Transaction reverted",
      });
    });

    it("should update status to CANCELLED with reason", async () => {
      const mockUpdatedDisbursement = createMockDisbursement({
        status: PayoutDisbursementStatus.CANCELLED,
      });
      mockPayoutService.updateDisbursementStatus.mockResolvedValue(mockUpdatedDisbursement);

      const { result } = renderHook(() => useUpdateDisbursementStatus(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          disbursementId: "disbursement-123",
          request: {
            status: PayoutDisbursementStatus.CANCELLED,
            reason: "Admin cancelled",
          },
        });
      });

      expect(mockPayoutService.updateDisbursementStatus).toHaveBeenCalledWith("disbursement-123", {
        status: PayoutDisbursementStatus.CANCELLED,
        reason: "Admin cancelled",
      });
    });
  });

  describe("payoutDisbursementKeys", () => {
    it("should have correct query key structure", () => {
      expect(payoutDisbursementKeys.all).toEqual(["payoutDisbursement"]);
      expect(payoutDisbursementKeys.grantHistory("grant-123")).toEqual([
        "payoutDisbursement",
        "grantHistory",
        "grant-123",
        { page: undefined, limit: undefined },
      ]);
      expect(payoutDisbursementKeys.grantHistory("grant-123", 2, 10)).toEqual([
        "payoutDisbursement",
        "grantHistory",
        "grant-123",
        { page: 2, limit: 10 },
      ]);
      expect(payoutDisbursementKeys.grantTotal("grant-123")).toEqual([
        "payoutDisbursement",
        "grantTotal",
        "grant-123",
      ]);
      expect(payoutDisbursementKeys.communityPending("community-123")).toEqual([
        "payoutDisbursement",
        "communityPending",
        "community-123",
        { page: undefined, limit: undefined },
      ]);
      expect(payoutDisbursementKeys.safeAwaiting("0xSafeAddress")).toEqual([
        "payoutDisbursement",
        "safeAwaiting",
        "0xSafeAddress",
        { page: undefined, limit: undefined },
      ]);
    });
  });
});
