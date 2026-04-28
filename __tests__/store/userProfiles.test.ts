import { act } from "@testing-library/react";
import type { PublicUserProfileInfo } from "@/services/community-admins.service";
import { communityAdminsService } from "@/services/community-admins.service";
import { useUserProfiles } from "@/store/userProfiles";

vi.mock("@/services/community-admins.service", () => ({
  communityAdminsService: {
    getPublicUserProfiles: vi.fn(),
  },
}));

const mockGetPublicUserProfiles = communityAdminsService.getPublicUserProfiles as ReturnType<
  typeof vi.fn
>;

function makeProfile(
  address: string,
  overrides?: Partial<PublicUserProfileInfo>
): PublicUserProfileInfo {
  return {
    publicAddress: address,
    name: `User ${address.slice(0, 6)}`,
    ...overrides,
  };
}

describe("useUserProfiles store", () => {
  beforeEach(() => {
    // resetAllMocks clears both call history AND pending mockResolvedValueOnce queues
    vi.resetAllMocks();
    act(() => {
      useUserProfiles.setState({ profiles: {} });
    });
  });

  describe("initial state", () => {
    it("starts with empty profiles", () => {
      expect(useUserProfiles.getState().profiles).toEqual({});
    });
  });

  describe("populateProfiles", () => {
    it("fetches profiles for new addresses", async () => {
      const addr = "0x1234567890abcdef1234567890abcdef12345678";
      const profile = makeProfile(addr);
      mockGetPublicUserProfiles.mockResolvedValueOnce(new Map([[addr, profile]]));

      await act(async () => {
        await useUserProfiles.getState().populateProfiles([addr]);
      });

      const stored = useUserProfiles.getState().profiles[addr];
      expect(stored).toMatchObject({ publicAddress: addr, name: profile.name, isTried: true });
    });

    it("lowercases addresses before fetching", async () => {
      const mixedAddr = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
      const lowerAddr = mixedAddr.toLowerCase();
      mockGetPublicUserProfiles.mockResolvedValueOnce(new Map());

      await act(async () => {
        await useUserProfiles.getState().populateProfiles([mixedAddr]);
      });

      expect(mockGetPublicUserProfiles).toHaveBeenCalledWith([lowerAddr]);
    });

    it("deduplicates addresses", async () => {
      const addr = "0x1234567890abcdef1234567890abcdef12345678";
      mockGetPublicUserProfiles.mockResolvedValueOnce(new Map());

      await act(async () => {
        await useUserProfiles.getState().populateProfiles([addr, addr, addr.toUpperCase()]);
      });

      expect(mockGetPublicUserProfiles).toHaveBeenCalledTimes(1);
      expect(mockGetPublicUserProfiles).toHaveBeenCalledWith([addr]);
    });

    it("skips addresses already tried", async () => {
      const addr = "0x1234567890abcdef1234567890abcdef12345678";
      act(() => {
        useUserProfiles.setState({
          profiles: {
            [addr]: { publicAddress: addr, name: "", isTried: true },
          },
        });
      });

      await act(async () => {
        await useUserProfiles.getState().populateProfiles([addr]);
      });

      expect(mockGetPublicUserProfiles).not.toHaveBeenCalled();
    });

    it("skips addresses currently in-flight", async () => {
      const addr = "0x1234567890abcdef1234567890abcdef12345678";
      act(() => {
        useUserProfiles.setState({
          profiles: {
            [addr]: { publicAddress: addr, name: "", isFetching: true },
          },
        });
      });

      await act(async () => {
        await useUserProfiles.getState().populateProfiles([addr]);
      });

      expect(mockGetPublicUserProfiles).not.toHaveBeenCalled();
    });

    it("marks address as isTried when not found in response", async () => {
      const addr = "0x1234567890abcdef1234567890abcdef12345678";
      mockGetPublicUserProfiles.mockResolvedValueOnce(new Map());

      await act(async () => {
        await useUserProfiles.getState().populateProfiles([addr]);
      });

      const stored = useUserProfiles.getState().profiles[addr];
      expect(stored.isTried).toBe(true);
      expect(stored.isFetching).toBe(false);
    });

    it("filters out invalid (non-0x) addresses", async () => {
      await act(async () => {
        await useUserProfiles.getState().populateProfiles(["not-an-address", "0xinvalid"]);
      });

      expect(mockGetPublicUserProfiles).not.toHaveBeenCalled();
    });

    it("swallows errors and marks addresses as isTried", async () => {
      const addr = "0x1234567890abcdef1234567890abcdef12345678";
      mockGetPublicUserProfiles.mockRejectedValueOnce(new Error("Network error"));

      await act(async () => {
        await useUserProfiles.getState().populateProfiles([addr]);
      });

      const stored = useUserProfiles.getState().profiles[addr];
      expect(stored.isTried).toBe(true);
      expect(stored.isFetching).toBe(false);
    });

    describe("chunking at 20", () => {
      it("splits 25 addresses into two batches (20 + 5)", async () => {
        const addresses = Array.from({ length: 25 }, (_, i) => {
          const hex = i.toString(16).padStart(40, "0");
          return `0x${hex}`;
        });

        mockGetPublicUserProfiles.mockResolvedValueOnce(new Map()).mockResolvedValueOnce(new Map());

        await act(async () => {
          await useUserProfiles.getState().populateProfiles(addresses);
        });

        expect(mockGetPublicUserProfiles).toHaveBeenCalledTimes(2);
        expect(mockGetPublicUserProfiles.mock.calls[0][0]).toHaveLength(20);
        expect(mockGetPublicUserProfiles.mock.calls[1][0]).toHaveLength(5);
      });

      it("sends exactly 20 addresses in a single batch for 20 addresses", async () => {
        const addresses = Array.from({ length: 20 }, (_, i) => {
          const hex = i.toString(16).padStart(40, "0");
          return `0x${hex}`;
        });

        mockGetPublicUserProfiles.mockResolvedValueOnce(new Map());

        await act(async () => {
          await useUserProfiles.getState().populateProfiles(addresses);
        });

        expect(mockGetPublicUserProfiles).toHaveBeenCalledTimes(1);
        expect(mockGetPublicUserProfiles.mock.calls[0][0]).toHaveLength(20);
      });
    });

    it("stores optional fields (email, picture) when present", async () => {
      const addr = "0x1234567890abcdef1234567890abcdef12345678";
      const profile = makeProfile(addr, {
        email: "user@example.com",
        picture: "https://example.com/avatar.png",
      });
      mockGetPublicUserProfiles.mockResolvedValueOnce(new Map([[addr, profile]]));

      await act(async () => {
        await useUserProfiles.getState().populateProfiles([addr]);
      });

      const stored = useUserProfiles.getState().profiles[addr];
      expect(stored.email).toBe("user@example.com");
      expect(stored.picture).toBe("https://example.com/avatar.png");
    });
  });
});
