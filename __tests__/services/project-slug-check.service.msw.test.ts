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
import { checkSlugExists } from "@/services/project.service";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue(null) },
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

  it("degrades to 'not taken' when the request fails", async () => {
    server.use(
      http.get(`${BASE}/v2/projects/slug/check/boom`, () =>
        HttpResponse.json({ message: "boom" }, { status: 500 })
      )
    );

    await expect(checkSlugExists("boom")).resolves.toBe(false);
  });
});
