/**
 * Mutation integration tests for programReviewersService.
 *
 * Tests the service layer directly via MSW:
 * - POST /v2/funding-program-configs/:programId/reviewers (addReviewer)
 * - DELETE /v2/funding-program-configs/:programId/reviewers/by-email (removeReviewer)
 * - GET /v2/funding-program-configs/:programId/reviewers (getReviewers)
 * - addMultipleReviewers batch operation
 * - validateReviewerData validation
 */

import { HttpResponse, http } from "msw";
import { programReviewersService } from "@/services/program-reviewers.service";
import { installMswLifecycle, server } from "../../msw/server";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

installMswLifecycle();

const PROGRAM_ID = "prog-001";

describe("programReviewersService (MSW integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getReviewers", () => {
    it("fetches and maps reviewer data correctly", async () => {
      server.use(
        http.get("*/v2/funding-program-configs/:programId/reviewers", () =>
          HttpResponse.json({
            reviewers: [
              {
                publicAddress: "0xReviewer1",
                programId: PROGRAM_ID,
                chainID: 10,
                userProfile: {
                  id: "user-1",
                  publicAddress: "0xReviewer1",
                  name: "Alice",
                  email: "alice@example.com",
                  telegram: "@alice_tg",
                  createdAt: "2024-01-01T00:00:00Z",
                  updatedAt: "2024-01-01T00:00:00Z",
                },
                assignedAt: "2024-06-01T10:00:00Z",
                assignedBy: "0xAdmin",
              },
            ],
          })
        )
      );

      const reviewers = await programReviewersService.getReviewers(PROGRAM_ID);

      expect(reviewers).toHaveLength(1);
      expect(reviewers[0]).toEqual({
        publicAddress: "0xReviewer1",
        name: "Alice",
        email: "alice@example.com",
        telegram: "@alice_tg",
        assignedAt: "2024-06-01T10:00:00Z",
        assignedBy: "0xAdmin",
      });
    });

    it("returns empty list for 'Program Reviewer Not Found'", async () => {
      server.use(
        http.get("*/v2/funding-program-configs/:programId/reviewers", () =>
          HttpResponse.json({ message: "Program Reviewer Not Found" }, { status: 404 })
        )
      );

      const reviewers = await programReviewersService.getReviewers(PROGRAM_ID);
      expect(reviewers).toEqual([]);
    });

    it("throws on unexpected errors", async () => {
      server.use(
        http.get("*/v2/funding-program-configs/:programId/reviewers", () =>
          HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
      );

      await expect(programReviewersService.getReviewers(PROGRAM_ID)).rejects.toThrow();
    });
  });

  describe("addReviewer", () => {
    it("sends POST with reviewer data and returns mapped result", async () => {
      let capturedBody: any = null;

      server.use(
        http.post("*/v2/funding-program-configs/:programId/reviewers", async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            reviewer: {
              publicAddress: "0xNewReviewer",
              programId: PROGRAM_ID,
              chainID: 10,
              userProfile: {
                id: "user-new",
                publicAddress: "0xNewReviewer",
                name: "Bob Reviewer",
                email: "bob@example.com",
                telegram: "@bob_tg",
                createdAt: "2024-06-15T00:00:00Z",
                updatedAt: "2024-06-15T00:00:00Z",
              },
              assignedAt: "2024-06-15T12:00:00Z",
              assignedBy: "0xAdmin",
            },
          });
        })
      );

      const result = await programReviewersService.addReviewer(PROGRAM_ID, {
        name: "Bob Reviewer",
        email: "bob@example.com",
        telegram: "@bob_tg",
      });

      expect(capturedBody).toEqual({
        name: "Bob Reviewer",
        email: "bob@example.com",
        telegram: "@bob_tg",
      });

      expect(result).toEqual({
        publicAddress: "0xNewReviewer",
        name: "Bob Reviewer",
        email: "bob@example.com",
        telegram: "@bob_tg",
        assignedAt: "2024-06-15T12:00:00Z",
        assignedBy: "0xAdmin",
      });
    });

    it("returns fallback data when API returns no reviewer object", async () => {
      server.use(
        http.post("*/v2/funding-program-configs/:programId/reviewers", () => HttpResponse.json({}))
      );

      const result = await programReviewersService.addReviewer(PROGRAM_ID, {
        name: "Fallback User",
        email: "fallback@example.com",
      });

      // Should use the submitted data as fallback
      expect(result.name).toBe("Fallback User");
      expect(result.email).toBe("fallback@example.com");
      expect(result.publicAddress).toBeUndefined();
    });
  });

  describe("removeReviewer", () => {
    it("sends DELETE with email in body", async () => {
      let capturedBody: any = null;

      server.use(
        http.delete(
          "*/v2/funding-program-configs/:programId/reviewers/by-email",
          async ({ request }) => {
            capturedBody = await request.json();
            return new HttpResponse(null, { status: 204 });
          }
        )
      );

      await programReviewersService.removeReviewer(PROGRAM_ID, "alice@example.com");

      expect(capturedBody).toEqual({ email: "alice@example.com" });
    });

    it("throws on failure", async () => {
      server.use(
        http.delete("*/v2/funding-program-configs/:programId/reviewers/by-email", () =>
          HttpResponse.json({ message: "Reviewer not found" }, { status: 404 })
        )
      );

      await expect(
        programReviewersService.removeReviewer(PROGRAM_ID, "nonexistent@example.com")
      ).rejects.toThrow();
    });
  });

  describe("addMultipleReviewers", () => {
    it("adds multiple reviewers and collects errors", async () => {
      let callCount = 0;

      server.use(
        http.post("*/v2/funding-program-configs/:programId/reviewers", async ({ request }) => {
          callCount++;
          const body = (await request.json()) as { name: string; email: string };

          if (body.email === "fail@example.com") {
            return HttpResponse.json({ message: "Duplicate reviewer" }, { status: 409 });
          }

          return HttpResponse.json({
            reviewer: {
              publicAddress: `0xAddr${callCount}`,
              programId: PROGRAM_ID,
              chainID: 10,
              userProfile: {
                id: `user-${callCount}`,
                publicAddress: `0xAddr${callCount}`,
                name: body.name,
                email: body.email,
                createdAt: "2024-01-01T00:00:00Z",
                updatedAt: "2024-01-01T00:00:00Z",
              },
              assignedAt: new Date().toISOString(),
            },
          });
        })
      );

      const result = await programReviewersService.addMultipleReviewers(PROGRAM_ID, [
        { name: "Alice", email: "alice@example.com" },
        { name: "Bad User", email: "fail@example.com" },
        { name: "Charlie", email: "charlie@example.com" },
      ]);

      // 2 should succeed, 1 should fail
      expect(result.added).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reviewer.email).toBe("fail@example.com");
    });
  });

  describe("validateReviewerData", () => {
    it("validates correct data", () => {
      const result = programReviewersService.validateReviewerData({
        name: "Alice",
        email: "alice@example.com",
        telegram: "@alice",
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects missing email", () => {
      const result = programReviewersService.validateReviewerData({
        name: "Alice",
        email: "",
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("rejects missing name", () => {
      const result = programReviewersService.validateReviewerData({
        name: "",
        email: "alice@example.com",
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
