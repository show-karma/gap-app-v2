// Mock Next.js server imports
jest.mock("next/server", () => ({
  NextResponse: {
    redirect: jest.fn((url: URL, status: number) => ({
      status,
      headers: new Map([["location", url.toString()]]),
    })),
  },
}));

import { shouldRedirectToGov, redirectToGov } from "../redirectHelpers";
import type { NextRequest } from "next/server";

describe("redirectHelpers", () => {
  describe("shouldRedirectToGov", () => {
    describe("exact path matches", () => {
      it("should redirect /actions", () => {
        expect(shouldRedirectToGov("/actions")).toBe(true);
      });

      it("should redirect /daos", () => {
        expect(shouldRedirectToGov("/daos")).toBe(true);
      });

      it("should redirect /delegation-week", () => {
        expect(shouldRedirectToGov("/delegation-week")).toBe(true);
      });

      it("should redirect /find-contributor", () => {
        expect(shouldRedirectToGov("/find-contributor")).toBe(true);
      });

      it("should redirect /gov", () => {
        expect(shouldRedirectToGov("/gov")).toBe(true);
      });

      it("should redirect /governance-tools", () => {
        expect(shouldRedirectToGov("/governance-tools")).toBe(true);
      });

      it("should redirect /how-it-works", () => {
        expect(shouldRedirectToGov("/how-it-works")).toBe(true);
      });

      it("should redirect /nft-badge-minting-service", () => {
        expect(shouldRedirectToGov("/nft-badge-minting-service")).toBe(true);
      });

      it("should redirect /endorse-governance-contributor", () => {
        expect(shouldRedirectToGov("/endorse-governance-contributor")).toBe(true);
      });

      it("should redirect /oldhome", () => {
        expect(shouldRedirectToGov("/oldhome")).toBe(true);
      });

      it("should redirect /github/linking", () => {
        expect(shouldRedirectToGov("/github/linking")).toBe(true);
      });

      it("should redirect /twitter/linking", () => {
        expect(shouldRedirectToGov("/twitter/linking")).toBe(true);
      });

      it("should redirect /discord/linking", () => {
        expect(shouldRedirectToGov("/discord/linking")).toBe(true);
      });

      it("should redirect /app/badge-template", () => {
        expect(shouldRedirectToGov("/app/badge-template")).toBe(true);
      });
    });

    describe("prefix path matches", () => {
      it("should redirect /dao/optimism", () => {
        expect(shouldRedirectToGov("/dao/optimism")).toBe(true);
      });

      it("should redirect /dao/optimism/delegators", () => {
        expect(shouldRedirectToGov("/dao/optimism/delegators")).toBe(true);
      });

      it("should redirect /dao/optimism/delegators/0x123", () => {
        expect(shouldRedirectToGov("/dao/optimism/delegators/0x123")).toBe(true);
      });

      it("should redirect /case-study/gitcoin", () => {
        expect(shouldRedirectToGov("/case-study/gitcoin")).toBe(true);
      });

      it("should redirect /case-study/ens", () => {
        expect(shouldRedirectToGov("/case-study/ens")).toBe(true);
      });

      it("should redirect /profile/0x123", () => {
        expect(shouldRedirectToGov("/profile/0x123")).toBe(true);
      });

      it("should redirect /profile/someone", () => {
        expect(shouldRedirectToGov("/profile/someone")).toBe(true);
      });

      it("should redirect /dynamic-nft/dev/org/repo", () => {
        expect(shouldRedirectToGov("/dynamic-nft/dev/org/repo")).toBe(true);
      });
    });

    describe("gap-app-v2 routes (should NOT redirect)", () => {
      it("should NOT redirect /project/123", () => {
        expect(shouldRedirectToGov("/project/123")).toBe(false);
      });

      it("should NOT redirect /community/optimism", () => {
        expect(shouldRedirectToGov("/community/optimism")).toBe(false);
      });

      it("should NOT redirect /projects", () => {
        expect(shouldRedirectToGov("/projects")).toBe(false);
      });

      it("should NOT redirect /admin", () => {
        expect(shouldRedirectToGov("/admin")).toBe(false);
      });

      it("should NOT redirect /stats", () => {
        expect(shouldRedirectToGov("/stats")).toBe(false);
      });

      it("should NOT redirect /funders", () => {
        expect(shouldRedirectToGov("/funders")).toBe(false);
      });

      it("should NOT redirect /funding-map", () => {
        expect(shouldRedirectToGov("/funding-map")).toBe(false);
      });

      it("should NOT redirect /my-projects", () => {
        expect(shouldRedirectToGov("/my-projects")).toBe(false);
      });

      it("should NOT redirect /my-reviews", () => {
        expect(shouldRedirectToGov("/my-reviews")).toBe(false);
      });

      it("should NOT redirect / (homepage)", () => {
        expect(shouldRedirectToGov("/")).toBe(false);
      });
    });

    describe("conflict resolution (gap-app-v2 wins)", () => {
      it("should NOT redirect /privacy-policy (exists in both repos, gap-app-v2 wins)", () => {
        expect(shouldRedirectToGov("/privacy-policy")).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("should NOT redirect empty string", () => {
        expect(shouldRedirectToGov("")).toBe(false);
      });

      it("should NOT redirect /dao (without trailing slash)", () => {
        expect(shouldRedirectToGov("/dao")).toBe(false);
      });

      it("should NOT redirect /profile (without trailing slash)", () => {
        expect(shouldRedirectToGov("/profile")).toBe(false);
      });

      it("should NOT redirect routes with query params", () => {
        // shouldRedirectToGov only checks pathname, query params handled separately
        expect(shouldRedirectToGov("/dao/optimism?tab=delegates")).toBe(true);
      });
    });
  });

  describe("redirectToGov", () => {
    describe("production environment", () => {
      beforeEach(() => {
        process.env.NEXT_PUBLIC_ENV = "production";
      });

      it("should create redirect to gov.karmahq.xyz with same pathname", () => {
        const mockRequest = {
          nextUrl: {
            pathname: "/dao/optimism",
            search: "",
          },
          url: "http://karmahq.xyz/dao/optimism",
        } as unknown as NextRequest;

        const response = redirectToGov(mockRequest);

        expect(response.status).toBe(308); // Permanent Redirect
        expect(response.headers.get("location")).toBe(
          "http://gov.karmahq.xyz/dao/optimism"
        );
      });

      it("should preserve query parameters", () => {
        const mockRequest = {
          nextUrl: {
            pathname: "/dao/optimism",
            search: "?tab=delegates&page=2",
          },
          url: "http://karmahq.xyz/dao/optimism?tab=delegates&page=2",
        } as unknown as NextRequest;

        const response = redirectToGov(mockRequest);

        expect(response.status).toBe(308);
        expect(response.headers.get("location")).toBe(
          "http://gov.karmahq.xyz/dao/optimism?tab=delegates&page=2"
        );
      });
    });

    describe("staging environment", () => {
      beforeEach(() => {
        process.env.NEXT_PUBLIC_ENV = "staging";
      });

      it("should create redirect to govstag.karmahq.xyz with same pathname", () => {
        const mockRequest = {
          nextUrl: {
            pathname: "/dao/optimism",
            search: "",
          },
          url: "http://gapstag.karmahq.xyz/dao/optimism",
        } as unknown as NextRequest;

        const response = redirectToGov(mockRequest);

        expect(response.status).toBe(308); // Permanent Redirect
        expect(response.headers.get("location")).toBe(
          "http://govstag.karmahq.xyz/dao/optimism"
        );
      });

      it("should preserve query parameters in staging", () => {
        const mockRequest = {
          nextUrl: {
            pathname: "/dao/optimism",
            search: "?tab=delegates&page=2",
          },
          url: "http://gapstag.karmahq.xyz/dao/optimism?tab=delegates&page=2",
        } as unknown as NextRequest;

        const response = redirectToGov(mockRequest);

        expect(response.status).toBe(308);
        expect(response.headers.get("location")).toBe(
          "http://govstag.karmahq.xyz/dao/optimism?tab=delegates&page=2"
        );
      });
    });

    it("should preserve hash fragments", () => {
      process.env.NEXT_PUBLIC_ENV = "production";

      const mockRequest = {
        nextUrl: {
          pathname: "/profile/0x123",
          search: "#section",
        },
        url: "http://karmahq.xyz/profile/0x123#section",
      } as unknown as NextRequest;

      const response = redirectToGov(mockRequest);

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toContain("gov.karmahq.xyz");
    });

    it("should use 308 Permanent Redirect status code", () => {
      process.env.NEXT_PUBLIC_ENV = "production";

      const mockRequest = {
        nextUrl: {
          pathname: "/actions",
          search: "",
        },
        url: "http://karmahq.xyz/actions",
      } as unknown as NextRequest;

      const response = redirectToGov(mockRequest);

      expect(response.status).toBe(308);
    });
  });
});
