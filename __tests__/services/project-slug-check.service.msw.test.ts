/**
 * @vitest-environment node
 *
 * Regression coverage for the project-creation slug poll.
 *
 * These run through the real api client (schema validation included) against a
 * payload byte-identical to what the indexer returns, because the bug lived in
 * the gap between the FE zod schema and the BE response DTO — a seam that a
 * mocked `api.get` can never exercise.
 */
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { errorManager } from "@/components/Utilities/errorManager";
import { checkSlugExists } from "@/services/project.service";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue(null) },
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

const BASE = "http://localhost:4000";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const slugCheck = (slug: string, body: unknown) =>
  http.get(`${BASE}/v2/projects/slug/check/${slug}`, () => HttpResponse.json(body));

describe("checkSlugExists", () => {
  it("reports the slug as taken using the indexer's real payload shape", async () => {
    // Verbatim from GET /v2/projects/slug/check/intrinseco — note `title`, not `slug`.
    server.use(
      slugCheck("intrinseco", {
        available: false,
        existingProject: {
          uid: "0x4c4a2a897838b9ff6b086e3556d317efcabe69a3d2a601a836e98980169a102a",
          title: "Intrinseco",
        },
      })
    );

    await expect(checkSlugExists("intrinseco")).resolves.toBe(true);
  });

  it("reports the slug as free when available", async () => {
    server.use(slugCheck("brand-new", { available: true }));

    await expect(checkSlugExists("brand-new")).resolves.toBe(false);
  });

  it("tolerates unknown fields on existingProject", async () => {
    server.use(
      slugCheck("drifted", {
        available: false,
        existingProject: { uid: "0xabc", title: "Drifted", somethingNew: 42 },
      })
    );

    await expect(checkSlugExists("drifted")).resolves.toBe(true);
  });

  it("reports a contract violation once, not on every poll tick", async () => {
    // A shape the schema cannot accept, to force a ContractViolationError.
    server.use(slugCheck("broken-contract", { available: "nope" }));

    await expect(checkSlugExists("broken-contract")).resolves.toBe(false);
    expect(errorManager).toHaveBeenCalledTimes(1);
    expect(errorManager).toHaveBeenCalledWith(
      expect.stringContaining("contract violation"),
      expect.anything(),
      { context: "project.service" }
    );

    // The creation poll runs up to 1000 ticks; a deterministic violation must
    // not produce 1000 Sentry events.
    await checkSlugExists("broken-contract");
    await checkSlugExists("broken-contract");
    expect(errorManager).toHaveBeenCalledTimes(1);
  });

  it("degrades to 'not taken' when the request fails", async () => {
    server.use(
      http.get(`${BASE}/v2/projects/slug/check/boom`, () =>
        HttpResponse.json({ message: "boom" }, { status: 500 })
      )
    );

    await expect(checkSlugExists("boom")).resolves.toBe(false);
  });
});
