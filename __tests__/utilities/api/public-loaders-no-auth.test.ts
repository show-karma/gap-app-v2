import { getProject } from "@/services/project.service";
import { getExplorerProjects } from "@/services/projects-explorer.service";
import { fundingProgramsService } from "@/src/features/funding-map/services/funding-programs.service";
import { api } from "@/utilities/api/client";
import {
  getCommunityDetails,
  getCommunityProjects,
  getCommunityStats,
} from "@/utilities/queries/v2/getCommunityData";

/**
 * The behavioural half of the D2 gate: the four public loaders must not send an
 * `Authorization` header while rendering on the server.
 *
 * `__tests__/utilities/api/public-read.test.ts` covers *why* that is safe — the
 * indexer's auth posture per endpoint. This file covers that the loaders
 * actually do it, on every read that a crawlable route reaches.
 */

vi.mock("@/utilities/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

const apiGet = vi.mocked(api.get);

const realWindow = globalThis.window;

function renderOnServer() {
  Reflect.deleteProperty(globalThis, "window");
}

function renderOnClient() {
  Object.defineProperty(globalThis, "window", {
    value: realWindow ?? {},
    configurable: true,
    writable: true,
  });
}

/** Every `isAuthorized` the loader passed, across all of its reads. */
function authFlags(): Array<boolean | undefined> {
  return apiGet.mock.calls.map((call) => {
    const options = call[1] as { isAuthorized?: boolean } | undefined;
    return options?.isAuthorized;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  apiGet.mockResolvedValue({} as never);
});

afterEach(renderOnClient);

describe("public loaders drop the token on the server", () => {
  const loaders: Array<[string, () => Promise<unknown>]> = [
    ["projects-explorer getExplorerProjects", () => getExplorerProjects({ limit: 3 })],
    ["project.service getProject", () => getProject("a-slug")],
    ["funding-programs getAll", () => fundingProgramsService.getAll({ page: 1 })],
    ["funding-programs getById", () => fundingProgramsService.getById("prog_1")],
    ["getCommunityData getCommunityDetails", () => getCommunityDetails("gitcoin")],
    ["getCommunityData getCommunityStats", () => getCommunityStats("gitcoin")],
    ["getCommunityData getCommunityProjects", () => getCommunityProjects("gitcoin", {})],
  ];

  it.each(loaders)("%s sends isAuthorized: false server-side", async (_name, run) => {
    renderOnServer();

    await run().catch(() => {
      // A loader that rejects on an empty mock payload has still made its call,
      // which is the only thing under test here.
    });

    expect(apiGet).toHaveBeenCalled();
    expect(authFlags().every((flag) => flag === false)).toBe(true);
  });

  it.each(loaders)("%s keeps the token client-side", async (_name, run) => {
    renderOnClient();

    await run().catch(() => {});

    expect(apiGet).toHaveBeenCalled();
    // `true` explicitly, never `undefined` — an unset flag defaults to authorized
    // in api.get, which is right for the client but must not be how we get there.
    expect(authFlags().every((flag) => flag === true)).toBe(true);
  });
});

describe("reads that deliberately keep their token", () => {
  // `checkSlugExists` polls during project creation, from the client only. It is
  // in project.service.ts next to `getProject`, so it is worth pinning that it
  // was not swept up: it is not on any crawlable render path.
  it("leaves checkSlugExists alone", async () => {
    const { checkSlugExists } = await import("@/services/project.service");
    renderOnServer();

    await checkSlugExists("some-slug").catch(() => {});

    expect(authFlags().every((flag) => flag === undefined)).toBe(true);
  });
});
