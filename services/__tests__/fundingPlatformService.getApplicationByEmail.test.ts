import { HttpError } from "@/utilities/api/errors";

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

vi.mock("@/utilities/auth/api-client", () => {
  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };

  return {
    createAuthenticatedApiClient: vi.fn(() => instance),
  };
});

import { api } from "@/utilities/api/client";
import { fundingApplicationsAPI } from "../fundingPlatformService";

const mockApiGet = api.get as vi.MockedFunction<typeof api.get>;

describe("fundingApplicationsAPI.getApplicationByEmail error classification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws (does not swallow) a non-404 error whose message happens to contain 'not found'", async () => {
    // Regression: the null-fallback must key off HttpError.status === 404,
    // not a substring match on the error message — a 500 whose backend
    // body says e.g. "Program not found" must still surface as an error.
    mockApiGet.mockRejectedValue(
      new HttpError(500, {
        endpoint: "/v2/funding-applications/by-email",
        method: "GET",
        body: { message: "Program not found" },
      })
    );

    await expect(
      fundingApplicationsAPI.getApplicationByEmail("program-123", "test@example.com")
    ).rejects.toThrow();
  });
});
