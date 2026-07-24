/**
 * Wire-shape integration tests for pendingAgentWritesService (MSW).
 *
 * Asserts the FE half of the mcp-writes wire contract: the service hits the
 * exact endpoint paths and methods, attaches the Privy `Authorization: Bearer`
 * header (via the typed api client + TokenManager) and an `Idempotency-Key` on
 * approve/reject, and that success / 409 / 500 responses are handled per the
 * contract (409 = "already decided").
 *
 * Pattern: __tests__/integration/mutations/community-admins.mutation.test.tsx
 */

import { HttpResponse, http } from "msw";
import {
  type PendingAgentWrite,
  pendingAgentWritesService,
} from "@/services/pending-agent-writes.service";
import { HttpError } from "@/utilities/api/errors";
import { installMswLifecycle, server } from "../../msw/server";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

installMswLifecycle();

const write: PendingAgentWrite = {
  id: "pc_abc123",
  summary: "Reject application #47 (out of scope)",
  label: "Approve / reject / revision",
  method: "PUT",
  path: "/v2/funding-applications/47/status",
  body: { status: "rejected", reason: "out of scope" },
  status: "pending",
  clientName: "Claude Desktop",
  createdAt: "2026-07-23T10:00:00.000Z",
  expiresAt: "2026-07-23T22:00:00.000Z",
  decidedAt: null,
  result: null,
};

describe("pendingAgentWritesService (MSW integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("GETs the queue with the status filter and an Authorization header", async () => {
      let capturedUrl = "";
      let capturedAuth: string | null = null;

      server.use(
        http.get("*/v2/pending-agent-writes", ({ request }) => {
          capturedUrl = request.url;
          capturedAuth = request.headers.get("authorization");
          return HttpResponse.json({ writes: [write], total: 1 });
        })
      );

      const result = await pendingAgentWritesService.list("pending");

      expect(capturedUrl).toContain("/v2/pending-agent-writes");
      expect(capturedUrl).toContain("status=pending");
      expect(capturedAuth).toBe("Bearer test-token");
      expect(result.total).toBe(1);
      expect(result.writes[0].id).toBe("pc_abc123");
    });

    it("passes status=decided when requesting history", async () => {
      let capturedUrl = "";
      server.use(
        http.get("*/v2/pending-agent-writes", ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ writes: [], total: 0 });
        })
      );

      await pendingAgentWritesService.list("decided");

      expect(capturedUrl).toContain("status=decided");
    });
  });

  describe("approve", () => {
    it("POSTs to /:id/approve with Authorization + Idempotency-Key headers", async () => {
      let capturedMethod = "";
      let capturedAuth: string | null = null;
      let capturedIdempotency: string | null = null;

      server.use(
        http.post("*/v2/pending-agent-writes/:id/approve", ({ request, params }) => {
          capturedMethod = request.method;
          capturedAuth = request.headers.get("authorization");
          capturedIdempotency = request.headers.get("idempotency-key");
          return HttpResponse.json({
            id: params.id,
            status: "executed",
            result: { statusCode: 200, error: null },
          });
        })
      );

      const result = await pendingAgentWritesService.approve("pc_abc123", "idem-key-1");

      expect(capturedMethod).toBe("POST");
      expect(capturedAuth).toBe("Bearer test-token");
      expect(capturedIdempotency).toBe("idem-key-1");
      expect(result.id).toBe("pc_abc123");
      expect(result.status).toBe("executed");
    });

    it("surfaces a 409 as an HttpError (already decided)", async () => {
      server.use(
        http.post("*/v2/pending-agent-writes/:id/approve", () =>
          HttpResponse.json({ message: "not pending" }, { status: 409 })
        )
      );

      await expect(pendingAgentWritesService.approve("pc_abc123")).rejects.toMatchObject({
        status: 409,
      });
      await expect(pendingAgentWritesService.approve("pc_abc123")).rejects.toBeInstanceOf(
        HttpError
      );
    });

    it("surfaces a 500 as an error", async () => {
      server.use(
        http.post("*/v2/pending-agent-writes/:id/approve", () =>
          HttpResponse.json({ message: "boom" }, { status: 500 })
        )
      );

      await expect(pendingAgentWritesService.approve("pc_abc123")).rejects.toThrow();
    });
  });

  describe("reject", () => {
    it("POSTs to /:id/reject and returns the rejected status", async () => {
      let capturedPath = "";
      let capturedIdempotency: string | null = null;

      server.use(
        http.post("*/v2/pending-agent-writes/:id/reject", ({ request, params }) => {
          capturedPath = new URL(request.url).pathname;
          capturedIdempotency = request.headers.get("idempotency-key");
          return HttpResponse.json({ id: params.id, status: "rejected" });
        })
      );

      const result = await pendingAgentWritesService.reject("pc_abc123", "idem-key-2");

      expect(capturedPath).toBe("/v2/pending-agent-writes/pc_abc123/reject");
      expect(capturedIdempotency).toBe("idem-key-2");
      expect(result.status).toBe("rejected");
    });

    it("surfaces a 409 as an HttpError", async () => {
      server.use(
        http.post("*/v2/pending-agent-writes/:id/reject", () =>
          HttpResponse.json({ message: "not pending" }, { status: 409 })
        )
      );

      await expect(pendingAgentWritesService.reject("pc_abc123")).rejects.toMatchObject({
        status: 409,
      });
    });
  });
});
