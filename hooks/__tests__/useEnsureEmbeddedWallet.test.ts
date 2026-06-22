import { renderHook, waitFor } from "@testing-library/react";

const mockCreateWallet = vi.fn();

vi.mock("@privy-io/react-auth", () => ({
  useCreateWallet: () => ({ createWallet: mockCreateWallet }),
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

// Resolve waits instantly so the settle window and retry backoff don't slow tests.
vi.mock("@/utilities/wait", () => ({
  wait: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/utilities/auth/compare-all-wallets", () => ({
  getLinkedWalletAddresses: vi.fn(() => []),
}));

import type { User } from "@privy-io/react-auth";
import { errorManager } from "@/components/Utilities/errorManager";
import { useEnsureEmbeddedWallet } from "../useEnsureEmbeddedWallet";

const mockErrorManager = errorManager as unknown as ReturnType<typeof vi.fn>;

let userCounter = 0;
const createMockUser = (): User =>
  ({
    id: `did:privy:user-${userCounter++}`,
    linkedAccounts: [],
  }) as unknown as User;

const renderEnsureWallet = (user: User) =>
  renderHook(() =>
    useEnsureEmbeddedWallet(
      true, // ready
      true, // authenticated
      user,
      0, // walletCount
      false // hasEmbeddedWallet
    )
  );

describe("useEnsureEmbeddedWallet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("already-exists race is idempotent success", () => {
    it("treats a structured Privy error code as success with no errorManager call", async () => {
      const user = createMockUser();
      const codeError = Object.assign(new Error("Some opaque message"), {
        code: "embedded_wallet_already_exists",
      });
      mockCreateWallet.mockRejectedValue(codeError);

      renderEnsureWallet(user);

      await waitFor(() => expect(mockCreateWallet).toHaveBeenCalled());
      // Give any (erroneous) retries a chance to fire before asserting.
      await waitFor(() => expect(mockErrorManager).not.toHaveBeenCalled());

      // Short-circuits on the first rejection — no retry loop exhaustion.
      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("treats the human-readable message alone as success with no errorManager call", async () => {
      const user = createMockUser();
      // No `.code` property — only Privy's human-readable message.
      mockCreateWallet.mockRejectedValue(new Error("User already has an embedded wallet."));

      renderEnsureWallet(user);

      await waitFor(() => expect(mockCreateWallet).toHaveBeenCalled());
      await waitFor(() => expect(mockErrorManager).not.toHaveBeenCalled());

      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
      expect(mockErrorManager).not.toHaveBeenCalled();
    });
  });

  describe("genuine failures", () => {
    it("retries and reports after exhausting all attempts on a transient error", async () => {
      const user = createMockUser();
      mockCreateWallet.mockRejectedValue(new Error("network unavailable"));

      renderEnsureWallet(user);

      await waitFor(() => expect(mockErrorManager).toHaveBeenCalledTimes(1));

      expect(mockCreateWallet).toHaveBeenCalledTimes(3);
      expect(mockErrorManager).toHaveBeenCalledWith(
        "Failed to create embedded wallet on login",
        expect.any(Error),
        expect.objectContaining({ attempts: 3 })
      );
    });
  });

  describe("happy path", () => {
    it("creates exactly one wallet and reports nothing on success", async () => {
      const user = createMockUser();
      mockCreateWallet.mockResolvedValue(undefined);

      renderEnsureWallet(user);

      await waitFor(() => expect(mockCreateWallet).toHaveBeenCalledTimes(1));
      expect(mockErrorManager).not.toHaveBeenCalled();
    });
  });
});
