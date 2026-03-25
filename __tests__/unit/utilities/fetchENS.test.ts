import type { Hex } from "viem";

// ---- Mocks ----
// The mock client is created inside the factory because vi.mock is hoisted
// above variable declarations. We retrieve the mock functions after import
// by accessing the mocked createPublicClient's return value.

vi.mock("viem", () => {
  // We cannot reference outer variables from a hoisted vi.mock factory,
  // so we store the mock client on a global that persists across the hoist.
  const client = {
    getEnsName: vi.fn(),
    getEnsAvatar: vi.fn(),
    getEnsAddress: vi.fn(),
  };
  // Attach to global so we can retrieve it in tests
  (globalThis as any).__mockEnsClient = client;

  return {
    createPublicClient: vi.fn(() => client),
    http: vi.fn(() => "mock-transport"),
    isAddress: vi.fn((addr: string) => /^0x[0-9a-fA-F]{40}$/i.test(addr)),
  };
});

vi.mock("viem/chains", () => ({
  mainnet: { id: 1, name: "Ethereum", network: "homestead" },
}));

vi.mock("viem/ens", () => ({
  normalize: vi.fn((name: string) => name),
}));

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    RPC: {
      MAINNET: "https://mock-rpc.example.com",
    },
  },
}));

// ---- Imports (after mocks) ----

import { createPublicClient, http } from "viem";
import { errorManager } from "@/components/Utilities/errorManager";
import { fetchAddressFromENS, fetchENS } from "@/utilities/fetchENS";

// Retrieve the actual mock functions that were created inside the hoisted factory
const ensClient = (globalThis as any).__mockEnsClient as {
  getEnsName: vi.Mock;
  getEnsAvatar: vi.Mock;
  getEnsAddress: vi.Mock;
};

// ---- Helpers ----

function makeAddress(index: number): Hex {
  return `0x${String(index).padStart(40, "0")}` as Hex;
}

// ---- Tests ----

describe("fetchENS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic resolution", () => {
    it("resolves ENS names and avatars for a list of addresses", async () => {
      const addr1 = "0x1234567890abcdef1234567890abcdef12345678" as Hex;
      const addr2 = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as Hex;

      ensClient.getEnsName.mockResolvedValueOnce("alice.eth").mockResolvedValueOnce("bob.eth");
      ensClient.getEnsAvatar
        .mockResolvedValueOnce("https://avatar.alice.eth")
        .mockResolvedValueOnce("https://avatar.bob.eth");

      const results = await fetchENS([addr1, addr2]);

      expect(results).toEqual([
        { name: "alice.eth", address: addr1, avatar: "https://avatar.alice.eth" },
        { name: "bob.eth", address: addr2, avatar: "https://avatar.bob.eth" },
      ]);

      expect(ensClient.getEnsName).toHaveBeenCalledTimes(2);
      expect(ensClient.getEnsAvatar).toHaveBeenCalledTimes(2);
    });

    it("returns undefined name and avatar when getEnsName returns null", async () => {
      const addr = "0x0000000000000000000000000000000000000001" as Hex;

      ensClient.getEnsName.mockResolvedValueOnce(null);

      const results = await fetchENS([addr]);

      expect(results).toEqual([{ name: undefined, address: addr, avatar: undefined }]);
      // Avatar should not be fetched when name is null
      expect(ensClient.getEnsAvatar).not.toHaveBeenCalled();
    });

    it("returns avatar as null when getEnsAvatar fails", async () => {
      const addr = "0x0000000000000000000000000000000000000002" as Hex;

      ensClient.getEnsName.mockResolvedValueOnce("charlie.eth");
      ensClient.getEnsAvatar.mockRejectedValueOnce(new Error("Avatar fetch failed"));

      const results = await fetchENS([addr]);

      expect(results).toEqual([{ name: "charlie.eth", address: addr, avatar: null }]);
    });
  });

  describe("error handling", () => {
    it("silently returns fallback when ENS name resolution fails", async () => {
      const addr = "0x0000000000000000000000000000000000000003" as Hex;

      ensClient.getEnsName.mockRejectedValueOnce(new Error("429 Too Many Requests"));

      const results = await fetchENS([addr]);

      expect(results).toEqual([{ name: undefined, address: addr, avatar: undefined }]);
      expect(errorManager).not.toHaveBeenCalled();
    });

    it("silently returns null avatar when ENS avatar resolution fails", async () => {
      const addr = "0x0000000000000000000000000000000000000003" as Hex;

      ensClient.getEnsName.mockResolvedValueOnce("test.eth");
      ensClient.getEnsAvatar.mockRejectedValueOnce(new Error("TypeError from viem internals"));

      const results = await fetchENS([addr]);

      expect(results).toEqual([{ name: "test.eth", address: addr, avatar: null }]);
      expect(errorManager).not.toHaveBeenCalled();
    });

    it("handles all addresses failing gracefully without reporting to Sentry", async () => {
      const addr1 = "0x0000000000000000000000000000000000000004" as Hex;
      const addr2 = "0x0000000000000000000000000000000000000005" as Hex;

      ensClient.getEnsName
        .mockRejectedValueOnce(new Error("RPC error 1"))
        .mockRejectedValueOnce(new Error("RPC error 2"));

      const results = await fetchENS([addr1, addr2]);

      expect(results).toEqual([
        { name: undefined, address: addr1, avatar: undefined },
        { name: undefined, address: addr2, avatar: undefined },
      ]);
      expect(errorManager).not.toHaveBeenCalled();
    });

    it("handles a mix of successful and failed resolutions", async () => {
      const addrOk = "0x0000000000000000000000000000000000000006" as Hex;
      const addrFail = "0x0000000000000000000000000000000000000007" as Hex;

      ensClient.getEnsName
        .mockResolvedValueOnce("success.eth")
        .mockRejectedValueOnce(new Error("Timeout"));
      ensClient.getEnsAvatar.mockResolvedValueOnce("https://avatar.success.eth");

      const results = await fetchENS([addrOk, addrFail]);

      expect(results).toEqual([
        { name: "success.eth", address: addrOk, avatar: "https://avatar.success.eth" },
        { name: undefined, address: addrFail, avatar: undefined },
      ]);
    });
  });

  describe("edge cases", () => {
    it("returns an empty array for an empty address list", async () => {
      const results = await fetchENS([]);

      expect(results).toEqual([]);
      expect(ensClient.getEnsName).not.toHaveBeenCalled();
      expect(ensClient.getEnsAvatar).not.toHaveBeenCalled();
    });

    it("filters out invalid addresses", async () => {
      const validAddr = "0x0000000000000000000000000000000000000001" as Hex;

      ensClient.getEnsName.mockResolvedValueOnce("valid.eth");
      ensClient.getEnsAvatar.mockResolvedValueOnce(null);

      const results = await fetchENS([validAddr, "not-an-address", "0xshort"]);

      expect(results).toHaveLength(1);
      expect(results[0].address).toBe(validAddr);
      expect(ensClient.getEnsName).toHaveBeenCalledTimes(1);
    });
  });

  describe("batching", () => {
    it("processes addresses in batches of 10", async () => {
      const addresses: Hex[] = [];
      for (let i = 1; i <= 15; i++) {
        addresses.push(makeAddress(i));
      }

      let callCount = 0;

      ensClient.getEnsName.mockImplementation(() => {
        callCount++;
        return Promise.resolve(`name${callCount}.eth`);
      });
      ensClient.getEnsAvatar.mockImplementation(() => {
        return Promise.resolve(null);
      });

      const results = await fetchENS(addresses);

      expect(results).toHaveLength(15);
      expect(ensClient.getEnsName).toHaveBeenCalledTimes(15);

      // Verify all 15 addresses got results
      for (let i = 0; i < 15; i++) {
        expect(results[i].address).toBe(addresses[i]);
        expect(results[i].name).toBeDefined();
      }
    });

    it("handles a batch size exactly equal to 10", async () => {
      const addresses: Hex[] = [];
      for (let i = 1; i <= 10; i++) {
        addresses.push(makeAddress(i + 100));
      }

      ensClient.getEnsName.mockResolvedValue("test.eth");
      ensClient.getEnsAvatar.mockResolvedValue(null);

      const results = await fetchENS(addresses);

      expect(results).toHaveLength(10);
      expect(ensClient.getEnsName).toHaveBeenCalledTimes(10);
    });

    it("handles addresses that span more than 2 batches (25 addresses)", async () => {
      const addresses: Hex[] = [];
      for (let i = 1; i <= 25; i++) {
        addresses.push(makeAddress(i + 200));
      }

      ensClient.getEnsName.mockResolvedValue(null);

      const results = await fetchENS(addresses);

      expect(results).toHaveLength(25);
      expect(ensClient.getEnsName).toHaveBeenCalledTimes(25);

      // All should have fallback values since getEnsName returns null
      for (const result of results) {
        expect(result.name).toBeUndefined();
        expect(result.avatar).toBeUndefined();
      }
    });
  });

  describe("request deduplication", () => {
    it("deduplicates concurrent calls for the same address (ENS name)", async () => {
      const addr = "0x000000000000000000000000000000000000000a" as Hex;

      // Use a deferred promise so we can control when it resolves
      let resolveEns!: (value: string | null) => void;
      const ensPromise = new Promise<string | null>((resolve) => {
        resolveEns = resolve;
      });

      ensClient.getEnsName.mockReturnValueOnce(ensPromise);
      ensClient.getEnsAvatar.mockResolvedValue(null);

      // Launch two concurrent fetchENS calls for the same address
      const promise1 = fetchENS([addr]);
      const promise2 = fetchENS([addr]);

      // Resolve the single ENS call
      resolveEns("dedup.eth");

      const [results1, results2] = await Promise.all([promise1, promise2]);

      // Both should get the same result
      expect(results1[0].name).toBe("dedup.eth");
      expect(results2[0].name).toBe("dedup.eth");

      // getEnsName should only have been called ONCE because of deduplication
      expect(ensClient.getEnsName).toHaveBeenCalledTimes(1);
    });

    it("deduplicates concurrent avatar requests for the same ENS name", async () => {
      const addr1 = "0x000000000000000000000000000000000000000b" as Hex;
      const addr2 = "0x000000000000000000000000000000000000000c" as Hex;

      let resolveAvatar!: (value: string | null) => void;
      const avatarPromise = new Promise<string | null>((resolve) => {
        resolveAvatar = resolve;
      });

      // Both addresses resolve to the same ENS name
      ensClient.getEnsName.mockResolvedValueOnce("shared.eth").mockResolvedValueOnce("shared.eth");

      // Only one avatar call should happen due to deduplication
      ensClient.getEnsAvatar.mockReturnValueOnce(avatarPromise);

      const promise1 = fetchENS([addr1]);
      const promise2 = fetchENS([addr2]);

      resolveAvatar("https://avatar.shared.eth");

      const [results1, results2] = await Promise.all([promise1, promise2]);

      expect(results1[0].avatar).toBe("https://avatar.shared.eth");
      expect(results2[0].avatar).toBe("https://avatar.shared.eth");

      // Avatar should only be fetched once for "shared.eth"
      expect(ensClient.getEnsAvatar).toHaveBeenCalledTimes(1);
    });

    it("makes a new request after a previous one has completed (no stale cache)", async () => {
      const addr = "0x000000000000000000000000000000000000000d" as Hex;

      ensClient.getEnsName.mockResolvedValueOnce("first.eth");
      ensClient.getEnsAvatar.mockResolvedValueOnce(null);

      // First call completes
      await fetchENS([addr]);

      ensClient.getEnsName.mockResolvedValueOnce("second.eth");
      ensClient.getEnsAvatar.mockResolvedValueOnce(null);

      // Second call should make a new request since the first one completed
      const results = await fetchENS([addr]);

      expect(results[0].name).toBe("second.eth");
      expect(ensClient.getEnsName).toHaveBeenCalledTimes(2);
    });
  });

  describe("module initialization", () => {
    it("uses createPublicClient and http from viem", () => {
      expect(vi.isMockFunction(createPublicClient)).toBe(true);
      expect(vi.isMockFunction(http)).toBe(true);

      // The client returned by createPublicClient should be the mock we control
      expect(typeof ensClient.getEnsName).toBe("function");
      expect(typeof ensClient.getEnsAvatar).toBe("function");
      expect(typeof ensClient.getEnsAddress).toBe("function");
    });

    it("exports getEnsClient that returns a client lazily", async () => {
      const { getEnsClient } = await import("@/utilities/fetchENS");
      const client = getEnsClient();
      expect(client).toBeDefined();
      expect(client.getEnsName).toBeDefined();
    });

    it("returns the same client instance on subsequent calls (singleton)", async () => {
      const { getEnsClient } = await import("@/utilities/fetchENS");
      const client1 = getEnsClient();
      const client2 = getEnsClient();
      expect(client1).toBe(client2);
    });
  });
});

describe("fetchAddressFromENS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic resolution", () => {
    it("resolves addresses from ENS names", async () => {
      const resolvedAddr = "0x1111111111111111111111111111111111111111";

      ensClient.getEnsAddress.mockResolvedValueOnce(resolvedAddr);

      const results = await fetchAddressFromENS(["alice.eth"]);

      expect(results).toEqual([{ name: "alice.eth", address: resolvedAddr }]);
      expect(ensClient.getEnsAddress).toHaveBeenCalledWith({ name: "alice.eth" });
    });

    it("resolves multiple ENS names", async () => {
      ensClient.getEnsAddress
        .mockResolvedValueOnce("0xaaaa000000000000000000000000000000000001")
        .mockResolvedValueOnce("0xaaaa000000000000000000000000000000000002");

      const results = await fetchAddressFromENS(["alice.eth", "bob.eth"]);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        name: "alice.eth",
        address: "0xaaaa000000000000000000000000000000000001",
      });
      expect(results[1]).toEqual({
        name: "bob.eth",
        address: "0xaaaa000000000000000000000000000000000002",
      });
    });

    it("returns undefined address when getEnsAddress returns null", async () => {
      ensClient.getEnsAddress.mockResolvedValueOnce(null);

      const results = await fetchAddressFromENS(["nonexistent.eth"]);

      expect(results).toEqual([{ name: "nonexistent.eth", address: undefined }]);
    });
  });

  describe("error handling", () => {
    it("returns undefined address on failure and reports to errorManager", async () => {
      const resolveError = new Error("ENS resolution failed");
      ensClient.getEnsAddress.mockRejectedValueOnce(resolveError);

      const results = await fetchAddressFromENS(["broken.eth"]);

      expect(results).toEqual([{ name: "broken.eth", address: undefined }]);
      expect(errorManager).toHaveBeenCalledWith("ENS address resolution failed", resolveError, {
        name: "broken.eth",
      });
    });

    it("isolates per-name errors - one failure does not break others", async () => {
      ensClient.getEnsAddress
        .mockResolvedValueOnce("0xbbbb000000000000000000000000000000000001")
        .mockRejectedValueOnce(new Error("RPC error"))
        .mockResolvedValueOnce("0xbbbb000000000000000000000000000000000003");

      const results = await fetchAddressFromENS(["good1.eth", "bad.eth", "good2.eth"]);

      expect(results).toEqual([
        { name: "good1.eth", address: "0xbbbb000000000000000000000000000000000001" },
        { name: "bad.eth", address: undefined },
        { name: "good2.eth", address: "0xbbbb000000000000000000000000000000000003" },
      ]);
      expect(errorManager).toHaveBeenCalledTimes(1);
      expect(errorManager).toHaveBeenCalledWith(
        "ENS address resolution failed",
        expect.any(Error),
        { name: "bad.eth" }
      );
    });

    it("handles all names failing", async () => {
      ensClient.getEnsAddress
        .mockRejectedValueOnce(new Error("fail 1"))
        .mockRejectedValueOnce(new Error("fail 2"));

      const results = await fetchAddressFromENS(["fail1.eth", "fail2.eth"]);

      expect(results).toEqual([
        { name: "fail1.eth", address: undefined },
        { name: "fail2.eth", address: undefined },
      ]);
      expect(errorManager).toHaveBeenCalledTimes(2);
    });
  });

  describe("edge cases", () => {
    it("returns an empty array for an empty name list", async () => {
      const results = await fetchAddressFromENS([]);

      expect(results).toEqual([]);
      expect(ensClient.getEnsAddress).not.toHaveBeenCalled();
    });
  });

  describe("batching", () => {
    it("processes ENS names in batches of 10", async () => {
      const names: string[] = [];
      for (let i = 1; i <= 15; i++) {
        names.push(`name${i}.eth`);
      }

      ensClient.getEnsAddress.mockResolvedValue("0x0000000000000000000000000000000000000001");

      const results = await fetchAddressFromENS(names);

      expect(results).toHaveLength(15);
      expect(ensClient.getEnsAddress).toHaveBeenCalledTimes(15);
    });
  });
});
