import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  applicationHandlers,
  authHandlers,
  BASE,
  communityHandlers,
  projectHandlers,
} from "./handlers";
import { applicationErrorHandlers } from "./handlers/applications.handlers";
import { authErrorHandlers } from "./handlers/auth.handlers";
import { claimsErrorHandlers } from "./handlers/claims.handlers";
import { commentErrorHandlers } from "./handlers/comments.handlers";
import { communityErrorHandlers } from "./handlers/communities.handlers";
import { payoutErrorHandlers } from "./handlers/payouts.handlers";
import { programErrorHandlers } from "./handlers/programs.handlers";
import { projectErrorHandlers } from "./handlers/projects.handlers";
import { server } from "./server";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("MSW Handler Library", () => {
  describe("defaultHandlers — all domains respond", () => {
    it("returns auth permissions", async () => {
      const res = await fetch(`${BASE}/v2/auth/permissions`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty("isAdmin");
      expect(data).toHaveProperty("permissions");
    });

    it("returns application list by program", async () => {
      const res = await fetch(`${BASE}/v2/funding-applications/program/prog-001`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("uid");
      expect(data[0]).toHaveProperty("status");
    });

    it("returns a single application", async () => {
      const res = await fetch(`${BASE}/v2/funding-applications/app-uid-001`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty("uid");
      expect(data).toHaveProperty("referenceNumber");
    });

    it("returns community by slug", async () => {
      const res = await fetch(`${BASE}/v2/communities/ethereum-foundation`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty("name");
      expect(data).toHaveProperty("slug");
    });

    it("returns community metrics", async () => {
      const res = await fetch(`${BASE}/v2/communities/ethereum-foundation/metrics`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty("totalGrants");
      expect(data).toHaveProperty("totalProjects");
    });

    it("returns program registry list", async () => {
      const res = await fetch(`${BASE}/v2/program-registry`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty("payload");
      expect(Array.isArray(data.payload)).toBe(true);
    });

    it("returns program by id", async () => {
      const res = await fetch(`${BASE}/v2/program-registry/prog-001`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty("name");
      expect(data).toHaveProperty("programId");
    });

    it("returns funding program configs", async () => {
      const res = await fetch(`${BASE}/v2/funding-program-configs`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("returns project list", async () => {
      const res = await fetch(`${BASE}/v2/projects`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("title");
    });

    it("returns paginated project list", async () => {
      const res = await fetch(`${BASE}/v2/projects?page=1&limit=10`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty("payload");
      expect(data).toHaveProperty("pagination");
    });

    it("returns project by id", async () => {
      const res = await fetch(`${BASE}/v2/projects/proj-uid-001`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty("uid");
      expect(data).toHaveProperty("title");
    });

    it("returns search results", async () => {
      const res = await fetch(`${BASE}/v2/search?q=identity&limit=5`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty("projects");
      expect(data).toHaveProperty("programs");
      expect(data).toHaveProperty("communities");
    });

    it("returns payout history for a grant", async () => {
      const res = await fetch(`${BASE}/v2/payouts/grant/grant-uid-001/history`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("returns total disbursed for a grant", async () => {
      const res = await fetch(`${BASE}/v2/payouts/grant/grant-uid-001/total-disbursed`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty("totalDisbursed");
    });

    it("returns grant agreement", async () => {
      const res = await fetch(`${BASE}/v2/grant-agreements/grant-uid-001`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty("grantUID");
      expect(data).toHaveProperty("enabled");
    });

    it("returns milestone invoices", async () => {
      const res = await fetch(`${BASE}/v2/milestone-invoices/grant/grant-uid-001`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("returns application comments", async () => {
      const res = await fetch(`${BASE}/v2/applications/app-uid-001/comments`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty("comments");
      expect(Array.isArray(data.comments)).toBe(true);
    });
  });

  describe("mutation handlers", () => {
    it("creates an application", async () => {
      const res = await fetch(`${BASE}/v2/funding-applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Grant Proposal", description: "Details here" }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toHaveProperty("uid");
      expect(data.title).toBe("New Grant Proposal");
    });

    it("deletes an application", async () => {
      const res = await fetch(`${BASE}/v2/funding-applications/APP-2024-0001`, {
        method: "DELETE",
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("creates a payout disbursement", async () => {
      const res = await fetch(`${BASE}/v2/payouts/disburse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantUID: "grant-uid-001", amount: "5000", token: "USDC" }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toHaveProperty("uid");
      expect(data.status).toBe("NOT_STARTED");
    });

    it("creates a comment", async () => {
      const res = await fetch(`${BASE}/v2/applications/app-uid-001/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Looks good to me." }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.comment).toHaveProperty("id");
      expect(data.comment.content).toBe("Looks good to me.");
    });

    it("creates a program", async () => {
      const res = await fetch(`${BASE}/v2/program-registry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Program", description: "Fresh program" }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toHaveProperty("uid");
      expect(data.name).toBe("New Program");
    });
  });

  describe("error handlers override defaults", () => {
    it("application list returns 500", async () => {
      server.use(...applicationErrorHandlers());
      const res = await fetch(`${BASE}/v2/funding-applications/program/prog-001`);
      expect(res.status).toBe(500);
    });

    it("application detail returns 404", async () => {
      server.use(...applicationErrorHandlers());
      const res = await fetch(`${BASE}/v2/funding-applications/app-uid-001`);
      expect(res.status).toBe(404);
    });

    it("application create returns 400", async () => {
      server.use(...applicationErrorHandlers());
      const res = await fetch(`${BASE}/v2/funding-applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it("community returns 404", async () => {
      server.use(...communityErrorHandlers());
      const res = await fetch(`${BASE}/v2/communities/nonexistent`);
      expect(res.status).toBe(404);
    });

    it("project returns 404", async () => {
      server.use(...projectErrorHandlers());
      const res = await fetch(`${BASE}/v2/projects/nonexistent`);
      expect(res.status).toBe(404);
    });

    it("payout disburse returns 400", async () => {
      server.use(...payoutErrorHandlers());
      const res = await fetch(`${BASE}/v2/payouts/disburse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it("auth returns 401", async () => {
      server.use(...authErrorHandlers());
      const res = await fetch(`${BASE}/v2/auth/permissions`);
      expect(res.status).toBe(401);
    });

    it("comments returns 500", async () => {
      server.use(...commentErrorHandlers());
      const res = await fetch(`${BASE}/v2/applications/app-uid-001/comments`);
      expect(res.status).toBe(500);
    });

    it("claims agreement returns 404", async () => {
      server.use(...claimsErrorHandlers());
      const res = await fetch(`${BASE}/v2/grant-agreements/missing`);
      expect(res.status).toBe(404);
    });

    it("program returns 404", async () => {
      server.use(...programErrorHandlers());
      const res = await fetch(`${BASE}/v2/program-registry/missing`);
      expect(res.status).toBe(404);
    });
  });

  describe("custom data via options", () => {
    it("uses custom application list", async () => {
      server.use(
        ...applicationHandlers({
          list: [
            {
              uid: "custom-app",
              referenceNumber: "CUSTOM-001",
              status: "APPROVED",
              projectUID: "proj-custom",
              programId: "prog-custom",
              title: "Custom Application",
              description: "Custom description",
              createdAt: "2024-01-01T00:00:00.000Z",
              updatedAt: "2024-01-01T00:00:00.000Z",
            },
          ],
        })
      );
      const res = await fetch(`${BASE}/v2/funding-applications/program/prog-custom`);
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(data[0].uid).toBe("custom-app");
      expect(data[0].status).toBe("APPROVED");
    });

    it("uses custom auth permissions", async () => {
      server.use(
        ...authHandlers({ permissions: { isAdmin: true, permissions: ["manage:programs"] } })
      );
      const res = await fetch(`${BASE}/v2/auth/permissions`);
      const data = await res.json();
      expect(data.isAdmin).toBe(true);
      expect(data.permissions).toContain("manage:programs");
    });

    it("uses custom project list", async () => {
      server.use(
        ...projectHandlers({
          list: [
            {
              uid: "custom-proj",
              slug: "custom-project",
              title: "Custom Project",
              description: "Custom",
              payoutAddress: "0x0000000000000000000000000000000000000001",
              chainId: 42161,
              createdAt: "2024-01-01T00:00:00.000Z",
              updatedAt: "2024-01-01T00:00:00.000Z",
            },
          ],
        })
      );
      const res = await fetch(`${BASE}/v2/projects`);
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe("Custom Project");
    });

    it("uses custom community detail", async () => {
      server.use(
        ...communityHandlers({
          detail: { name: "Custom DAO", slug: "custom-dao" },
        })
      );
      const res = await fetch(`${BASE}/v2/communities/custom-dao`);
      const data = await res.json();
      expect(data.name).toBe("Custom DAO");
    });
  });

  describe("handler composability", () => {
    it("mixes handlers from different domains", async () => {
      server.use(...authHandlers({ permissions: { isAdmin: true } }), ...projectErrorHandlers());

      const authRes = await fetch(`${BASE}/v2/auth/permissions`);
      expect(authRes.ok).toBe(true);
      const authData = await authRes.json();
      expect(authData.isAdmin).toBe(true);

      const projRes = await fetch(`${BASE}/v2/projects/nonexistent`);
      expect(projRes.status).toBe(404);
    });
  });
});
