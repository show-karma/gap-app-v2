/**
 * Mutation integration tests for communityAdminsService.
 *
 * Tests the service layer directly (no hook wrapper) via MSW:
 * - POST /v2/user/resolve-email for resolveEmailToWallet
 * - GET /v2/user/profiles for getUserProfiles
 * - Verifies correct request body/params
 * - Tests error handling
 */

import { HttpResponse, http } from "msw";
import { communityAdminsService } from "@/services/community-admins.service";
import { installMswLifecycle, server } from "../../msw/server";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

installMswLifecycle();

describe("communityAdminsService (MSW integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveEmailToWallet", () => {
    it("sends POST with email and returns lowercase wallet address", async () => {
      let capturedBody: any = null;

      server.use(
        http.post("*/v2/user/resolve-email", async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            walletAddress: "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12",
          });
        })
      );

      const result = await communityAdminsService.resolveEmailToWallet("admin@example.com");

      expect(capturedBody).toEqual({ email: "admin@example.com" });
      // Should return lowercase
      expect(result).toBe("0xabcdef1234567890abcdef1234567890abcdef12");
    });

    it("sends name along with email when provided", async () => {
      let capturedBody: any = null;

      server.use(
        http.post("*/v2/user/resolve-email", async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
          });
        })
      );

      await communityAdminsService.resolveEmailToWallet("admin@example.com", "Alice Admin");

      expect(capturedBody).toEqual({
        email: "admin@example.com",
        name: "Alice Admin",
      });
    });

    it("throws on API error", async () => {
      server.use(
        http.post("*/v2/user/resolve-email", () =>
          HttpResponse.json({ message: "Not found" }, { status: 404 })
        )
      );

      await expect(
        communityAdminsService.resolveEmailToWallet("nonexistent@example.com")
      ).rejects.toThrow();
    });
  });

  describe("getUserProfiles", () => {
    it("returns empty map for empty address list", async () => {
      const result = await communityAdminsService.getUserProfiles([]);
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it("fetches profiles and returns map keyed by lowercase address", async () => {
      let capturedUrl = "";

      server.use(
        http.get("*/v2/user/profiles", ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json([
            {
              publicAddress: "0xABCD1234",
              name: "Alice",
              email: "alice@example.com",
            },
            {
              publicAddress: "0xEFGH5678",
              name: "Bob",
              email: "bob@example.com",
            },
          ]);
        })
      );

      const result = await communityAdminsService.getUserProfiles(["0xABCD1234", "0xEFGH5678"]);

      // Verify URL contains comma-separated addresses (commas may or may not be encoded)
      expect(capturedUrl).toContain("addresses=0xABCD1234");
      expect(capturedUrl).toContain("0xEFGH5678");

      // Verify map entries are lowercase
      expect(result.size).toBe(2);
      expect(result.get("0xabcd1234")).toEqual({
        publicAddress: "0xABCD1234",
        name: "Alice",
        email: "alice@example.com",
      });
      expect(result.get("0xefgh5678")).toEqual({
        publicAddress: "0xEFGH5678",
        name: "Bob",
        email: "bob@example.com",
      });
    });

    it("throws on API error", async () => {
      server.use(
        http.get("*/v2/user/profiles", () =>
          HttpResponse.json({ message: "Server error" }, { status: 500 })
        )
      );

      await expect(communityAdminsService.getUserProfiles(["0x1234"])).rejects.toThrow();
    });
  });
});
