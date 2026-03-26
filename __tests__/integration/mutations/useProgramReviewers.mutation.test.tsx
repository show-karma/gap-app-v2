/**
 * Mutation integration tests for useProgramReviewers hook.
 *
 * Tests add/remove reviewer mutations:
 * - POST to /v2/funding-program-configs/:programId/reviewers to add
 * - DELETE to /v2/funding-program-configs/:programId/reviewers/by-email to remove
 * - Validates reviewer data before submission (sanitization)
 * - Shows success/error toasts
 */

import { act, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useProgramReviewers } from "@/hooks/useProgramReviewers";
import { programReviewersService } from "@/services/program-reviewers.service";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    authenticated: true,
    address: "0x1234567890abcdef1234567890abcdef12345678",
    ready: true,
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn(),
    isConnected: true,
  }),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({}),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/test",
  useSearchParams: () => new URLSearchParams(),
}));

installMswLifecycle();

const PROGRAM_ID = "prog-001";

describe("useProgramReviewers mutations (MSW integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addReviewer mutation", () => {
    it("sends POST with validated/sanitized reviewer data", async () => {
      let capturedBody: any = null;

      server.use(
        http.get("*/v2/funding-program-configs/:programId/reviewers", () =>
          HttpResponse.json({ reviewers: [] })
        ),
        http.post("*/v2/funding-program-configs/:programId/reviewers", async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            reviewer: {
              publicAddress: "0xReviewer1",
              programId: PROGRAM_ID,
              chainID: 10,
              userProfile: {
                id: "user-1",
                publicAddress: "0xReviewer1",
                name: capturedBody?.name || "Alice",
                email: capturedBody?.email || "alice@example.com",
                createdAt: "2024-01-01T00:00:00Z",
                updatedAt: "2024-01-01T00:00:00Z",
              },
              assignedAt: new Date().toISOString(),
              assignedBy: "0xAdmin",
            },
          });
        })
      );

      const { result } = renderHookWithProviders(() => useProgramReviewers(PROGRAM_ID));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.addReviewer({
          name: "Alice Reviewer",
          email: "Alice@Example.COM",
          telegram: "@alice_tg",
        });
      });

      // Verify POST was called - the hook's validateReviewerData sanitizes the data
      expect(capturedBody).toBeDefined();
      expect(capturedBody.name).toBe("Alice Reviewer");
      expect(capturedBody.email).toBe("alice@example.com"); // lowercased by sanitizer
    });
  });

  describe("removeReviewer mutation", () => {
    it("sends DELETE with email", async () => {
      let capturedBody: any = null;
      let deleteUrl = "";

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
                  createdAt: "2024-01-01T00:00:00Z",
                  updatedAt: "2024-01-01T00:00:00Z",
                },
                assignedAt: "2024-06-01T10:00:00Z",
              },
            ],
          })
        ),
        http.delete(
          "*/v2/funding-program-configs/:programId/reviewers/by-email",
          async ({ request }) => {
            deleteUrl = new URL(request.url).pathname;
            capturedBody = await request.json();
            return new HttpResponse(null, { status: 204 });
          }
        )
      );

      const { result } = renderHookWithProviders(() => useProgramReviewers(PROGRAM_ID));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.removeReviewer("alice@example.com");
      });

      // Verify DELETE was called with correct email
      expect(deleteUrl).toContain(`/v2/funding-program-configs/${PROGRAM_ID}/reviewers/by-email`);
      expect(capturedBody).toEqual({ email: "alice@example.com" });
    });
  });

  describe("validation", () => {
    it("validates reviewer data before API submission", () => {
      // Test validation logic through the service directly
      const emptyEmailResult = programReviewersService.validateReviewerData({
        name: "Invalid User",
        email: "",
      });
      expect(emptyEmailResult.valid).toBe(false);
      expect(emptyEmailResult.errors.length).toBeGreaterThan(0);

      const emptyNameResult = programReviewersService.validateReviewerData({
        name: "",
        email: "valid@example.com",
      });
      expect(emptyNameResult.valid).toBe(false);

      const validResult = programReviewersService.validateReviewerData({
        name: "Valid User",
        email: "valid@example.com",
      });
      expect(validResult.valid).toBe(true);
    });

    it("sanitizes email to lowercase", () => {
      const result = programReviewersService.validateReviewerData({
        name: "User",
        email: "User@EXAMPLE.com",
      });
      expect(result.valid).toBe(true);
      expect(result.sanitized.email).toBe("user@example.com");
    });
  });
});
