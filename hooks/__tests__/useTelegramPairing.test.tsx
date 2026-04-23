import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import type { MockedFunction } from "vitest";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import {
  TelegramPairingError,
  useStartTelegramPairing,
  useVerifyTelegramPairing,
} from "../useTelegramPairing";

vi.mock("@/utilities/fetchData");

const mockFetchData = fetchData as MockedFunction<typeof fetchData>;

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
      mockFetchData.mockResolvedValue([startResponse, null, null, 200]);

      const { result } = renderHook(() => useStartTelegramPairing(SLUG), { wrapper });

      let mutationResult: typeof startResponse | undefined;
      await act(async () => {
        mutationResult = await result.current.mutateAsync();
      });

      expect(mutationResult).toEqual(startResponse);
      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.COMMUNITY.CONFIG.TELEGRAM_PAIR_START(SLUG),
        "POST",
        {},
        {},
        {},
        true
      );
    });

    it("throws a TelegramPairingError with status when backend returns an error", async () => {
      mockFetchData.mockResolvedValue([null, "Unavailable", null, 503]);

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
      mockFetchData.mockResolvedValue([null, "Boom", null, 500]);

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
      mockFetchData.mockResolvedValue([verifyResponse, null, null, 200]);

      const { result } = renderHook(() => useVerifyTelegramPairing(SLUG), { wrapper });

      let mutationResult: typeof verifyResponse | undefined;
      await act(async () => {
        mutationResult = await result.current.mutateAsync({ token: "KARMA-PAIR-ab3f9k" });
      });

      expect(mutationResult).toEqual(verifyResponse);
      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.COMMUNITY.CONFIG.TELEGRAM_PAIR_VERIFY(SLUG),
        "POST",
        { token: "KARMA-PAIR-ab3f9k" },
        {},
        {},
        true
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
      mockFetchData.mockResolvedValue([verifyResponse, null, null, 200]);

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
      mockFetchData.mockResolvedValue([null, "not found", null, 404]);

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
