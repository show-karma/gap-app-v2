import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";
import {
  TelegramPairingError,
  useStartTelegramPairing,
  useVerifyTelegramPairing,
} from "../useTelegramPairing";

vi.mock("@/utilities/api/client", () => ({
  api: { request: vi.fn() },
}));

const mockApiRequest = api.request as unknown as vi.Mock;

const SLUG = "filecoin";

describe("useTelegramPairing", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("useStartTelegramPairing", () => {
    it("POSTs to the telegram-pair/start endpoint with an empty body and returns the token", async () => {
      const startResponse = {
        token: "KARMA-PAIR-ab3f9k",
        expiresAt: "2026-04-17T12:34:56Z",
      };
      mockApiRequest.mockResolvedValue({ data: startResponse, status: 200, pageInfo: null });

      const { result } = renderHook(() => useStartTelegramPairing(SLUG), { wrapper });

      let mutationResult: typeof startResponse | undefined;
      await act(async () => {
        mutationResult = await result.current.mutateAsync();
      });

      expect(mutationResult).toEqual(startResponse);
      expect(mockApiRequest).toHaveBeenCalledWith(
        "POST",
        INDEXER.COMMUNITY.CONFIG.TELEGRAM_PAIR_START(SLUG),
        {}
      );
    });

    it("throws a TelegramPairingError with status when backend returns an error", async () => {
      mockApiRequest.mockRejectedValue(
        new HttpError(503, {
          endpoint: INDEXER.COMMUNITY.CONFIG.TELEGRAM_PAIR_START(SLUG),
          method: "POST",
          body: { message: "Unavailable" },
        })
      );

      const { result } = renderHook(() => useStartTelegramPairing(SLUG), { wrapper });

      await expect(
        act(async () => {
          await result.current.mutateAsync();
        })
      ).rejects.toMatchObject({
        message: "Unavailable",
        status: 503,
      });
    });

    it("throws an error that satisfies `instanceof TelegramPairingError`", async () => {
      // Previously the error was a plain Error with a stamped `status` field
      // cast via `as TelegramPairingError`, so `instanceof` checks at call
      // sites returned false. Now it's a real Error subclass — call sites
      // can branch on the class.
      mockApiRequest.mockRejectedValue(
        new HttpError(500, {
          endpoint: INDEXER.COMMUNITY.CONFIG.TELEGRAM_PAIR_START(SLUG),
          method: "POST",
          body: { message: "Boom" },
        })
      );

      const { result } = renderHook(() => useStartTelegramPairing(SLUG), { wrapper });

      let caught: unknown;
      await act(async () => {
        try {
          await result.current.mutateAsync();
        } catch (err) {
          caught = err;
        }
      });

      expect(caught).toBeInstanceOf(TelegramPairingError);
      expect(caught).toBeInstanceOf(Error);
      expect((caught as TelegramPairingError).status).toBe(500);
    });

    it("throws when community slug is undefined", async () => {
      const { result } = renderHook(() => useStartTelegramPairing(undefined), { wrapper });

      await expect(
        act(async () => {
          await result.current.mutateAsync();
        })
      ).rejects.toThrow("Community slug is required");
    });
  });

  describe("useVerifyTelegramPairing", () => {
    it("POSTs the token to the verify endpoint and returns chat info", async () => {
      const verifyResponse = {
        chatId: "-1001234567890",
        chatTitle: "Filecoin Grants",
        chatType: "supergroup",
        alreadyPaired: false,
      };
      mockApiRequest.mockResolvedValue({ data: verifyResponse, status: 200, pageInfo: null });

      const { result } = renderHook(() => useVerifyTelegramPairing(SLUG), { wrapper });

      let mutationResult: typeof verifyResponse | undefined;
      await act(async () => {
        mutationResult = await result.current.mutateAsync({ token: "KARMA-PAIR-ab3f9k" });
      });

      expect(mutationResult).toEqual(verifyResponse);
      expect(mockApiRequest).toHaveBeenCalledWith(
        "POST",
        INDEXER.COMMUNITY.CONFIG.TELEGRAM_PAIR_VERIFY(SLUG),
        { token: "KARMA-PAIR-ab3f9k" }
      );
    });

    it("patches the community-config cache (and does NOT invalidate) on success", async () => {
      // Seed cache with an existing config so we can verify the patch lands.
      const existingConfig = {
        disableReviewerEmails: false,
        telegramEnabled: false,
        telegramChats: [],
        slackEnabled: false,
        slackWebhookUrls: [],
      };
      queryClient.setQueryData(["community-config", SLUG], existingConfig);

      const verifyResponse = {
        chatId: "-100",
        chatTitle: "Test Group",
        chatType: "group",
        alreadyPaired: false,
      };
      mockApiRequest.mockResolvedValue({ data: verifyResponse, status: 200, pageInfo: null });

      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useVerifyTelegramPairing(SLUG), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ token: "KARMA-PAIR-xyz" });
      });

      // We deliberately do NOT invalidate — the setQueryData patch is the
      // authoritative update. Invalidating would trigger a refetch race that
      // can clobber unsaved local form edits in NotificationSettingsPage.
      expect(invalidateQueriesSpy).not.toHaveBeenCalled();

      // The cache patch added the new chat and auto-enabled telegram.
      const patched = queryClient.getQueryData(["community-config", SLUG]) as typeof existingConfig;
      expect(patched.telegramEnabled).toBe(true);
      expect(patched.telegramChats).toEqual([{ id: "-100", name: "Test Group" }]);
    });

    it("surfaces a 404 error with status preserved", async () => {
      mockApiRequest.mockRejectedValue(
        new HttpError(404, {
          endpoint: INDEXER.COMMUNITY.CONFIG.TELEGRAM_PAIR_VERIFY(SLUG),
          method: "POST",
          body: { message: "not found" },
        })
      );

      const { result } = renderHook(() => useVerifyTelegramPairing(SLUG), { wrapper });

      await expect(
        act(async () => {
          await result.current.mutateAsync({ token: "bogus" });
        })
      ).rejects.toMatchObject({
        message: "not found",
        status: 404,
      });
    });
  });
});
