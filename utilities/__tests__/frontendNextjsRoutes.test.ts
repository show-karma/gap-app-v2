import { FRONTEND_NEXTJS_ROUTES } from "../frontendNextjsRoutes";

describe("frontendNextjsRoutes", () => {
  describe("FRONTEND_NEXTJS_ROUTES configuration", () => {
    it("should be defined as an array", () => {
      expect(FRONTEND_NEXTJS_ROUTES).toBeDefined();
      expect(Array.isArray(FRONTEND_NEXTJS_ROUTES)).toBe(true);
    });

    it("should contain all expected exact path matches", () => {
      const exactPaths = [
        "/actions",
        "/daos",
        "/delegation-week",
        "/find-contributor",
        "/gov",
        "/governance-tools",
        "/how-it-works",
        "/nft-badge-minting-service",
        "/endorse-governance-contributor",
        "/oldhome",
        "/github/linking",
        "/twitter/linking",
        "/discord/linking",
        "/app/badge-template",
      ];

      exactPaths.forEach((path) => {
        expect(FRONTEND_NEXTJS_ROUTES).toContain(path);
      });
    });

    it("should contain all expected prefix path matches", () => {
      const prefixPaths = [
        "/dao/",
        "/case-study/",
        "/profile/",
        "/dynamic-nft/",
      ];

      prefixPaths.forEach((path) => {
        expect(FRONTEND_NEXTJS_ROUTES).toContain(path);
      });
    });

    it("should have all routes start with /", () => {
      FRONTEND_NEXTJS_ROUTES.forEach((route) => {
        expect(route).toMatch(/^\//);
      });
    });

    it("should NOT contain /privacy-policy (conflict route - gap-app-v2 wins)", () => {
      expect(FRONTEND_NEXTJS_ROUTES).not.toContain("/privacy-policy");
    });

    it("should NOT contain gap-app-v2 routes", () => {
      const gapRoutes = [
        "/project/",
        "/projects",
        "/community/",
        "/communities",
        "/admin",
        "/admin/",
        "/stats",
        "/funders",
        "/funding-map",
        "/funding-map/",
        "/my-projects",
        "/my-reviews",
        "/",
      ];

      gapRoutes.forEach((route) => {
        expect(FRONTEND_NEXTJS_ROUTES).not.toContain(route);
      });
    });

    it("should have no duplicate routes", () => {
      const routeSet = new Set(FRONTEND_NEXTJS_ROUTES);
      expect(routeSet.size).toBe(FRONTEND_NEXTJS_ROUTES.length);
    });

    it("should have no empty strings", () => {
      FRONTEND_NEXTJS_ROUTES.forEach((route) => {
        expect(route).not.toBe("");
        expect(route.length).toBeGreaterThan(0);
      });
    });

    describe("route naming conventions", () => {
      it("prefix routes should end with /", () => {
        const prefixRoutes = FRONTEND_NEXTJS_ROUTES.filter((route) =>
          route.endsWith("/")
        );

        // We expect these prefix routes
        const expectedPrefixes = [
          "/dao/",
          "/case-study/",
          "/profile/",
          "/dynamic-nft/",
        ];

        prefixRoutes.forEach((route) => {
          expect(expectedPrefixes).toContain(route);
        });
      });

      it("exact match routes should NOT end with /", () => {
        const exactRoutes = FRONTEND_NEXTJS_ROUTES.filter(
          (route) => !route.endsWith("/")
        );

        exactRoutes.forEach((route) => {
          expect(route).not.toMatch(/\/$/);
        });
      });
    });

    describe("total route count", () => {
      it("should have expected number of routes", () => {
        // 14 exact paths + 4 prefixes = 18 total
        expect(FRONTEND_NEXTJS_ROUTES.length).toBe(18);
      });

      it("should have 14 exact match routes", () => {
        const exactRoutes = FRONTEND_NEXTJS_ROUTES.filter(
          (route) => !route.endsWith("/")
        );
        expect(exactRoutes.length).toBe(14);
      });

      it("should have 4 prefix match routes", () => {
        const prefixRoutes = FRONTEND_NEXTJS_ROUTES.filter((route) =>
          route.endsWith("/")
        );
        expect(prefixRoutes.length).toBe(4);
      });
    });

    describe("type safety", () => {
      it("should use 'as const' for literal type inference", () => {
        // 'as const' provides type-level immutability in TypeScript
        // It creates literal types instead of string[] type
        // This test verifies the array structure is correct
        expect(FRONTEND_NEXTJS_ROUTES).toEqual(
          expect.arrayContaining([
            expect.any(String),
          ])
        );

        // Verify the first route is a string (compile-time this is a literal type)
        expect(typeof FRONTEND_NEXTJS_ROUTES[0]).toBe("string");
      });
    });
  });

  describe("route validation", () => {
    it("should only contain valid URL paths", () => {
      FRONTEND_NEXTJS_ROUTES.forEach((route) => {
        // Should not contain spaces
        expect(route).not.toMatch(/\s/);

        // Should not contain special characters except / and -
        expect(route).toMatch(/^\/[\w\-\/]*\/?$/);
      });
    });

    it("should not contain any api routes", () => {
      FRONTEND_NEXTJS_ROUTES.forEach((route) => {
        expect(route).not.toMatch(/\/api\//);
      });
    });

    it("should not contain Next.js internal routes", () => {
      const internalPatterns = ["_next", "_static", "_vercel"];

      FRONTEND_NEXTJS_ROUTES.forEach((route) => {
        internalPatterns.forEach((pattern) => {
          expect(route).not.toContain(pattern);
        });
      });
    });
  });

  describe("documentation compliance", () => {
    it("should match routes documented in DOMAIN_MIGRATION.md", () => {
      // This test ensures the configuration matches the documentation
      // If this fails, update the documentation or the routes

      const documentedExactRoutes = [
        "/actions",
        "/daos",
        "/delegation-week",
        "/find-contributor",
        "/gov",
        "/governance-tools",
        "/how-it-works",
        "/nft-badge-minting-service",
        "/endorse-governance-contributor",
        "/oldhome",
      ];

      const documentedPrefixRoutes = [
        "/dao/",
        "/case-study/",
        "/profile/",
        "/github/linking",
        "/twitter/linking",
        "/discord/linking",
        "/dynamic-nft/",
        "/app/badge-template",
      ];

      const allDocumentedRoutes = [
        ...documentedExactRoutes,
        ...documentedPrefixRoutes,
      ];

      allDocumentedRoutes.forEach((route) => {
        expect(FRONTEND_NEXTJS_ROUTES).toContain(route);
      });
    });
  });
});
