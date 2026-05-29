import axios from "axios";
import { TokenManager } from "@/utilities/auth/token-manager";
import fetchData from "@/utilities/fetchData";

vi.mock("axios");
vi.mock("@/utilities/auth/token-manager");
vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "https://test-api.com",
  },
}));
vi.mock("@/utilities/sanitize", () => ({
  sanitizeObject: vi.fn((data) => data),
}));

describe("fetchData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should make a successful GET request when an auth token is available", async () => {
    const mockResponse = { data: { result: "success" }, status: 200 };
    (axios.request as vi.Mock).mockResolvedValue(mockResponse);
    (TokenManager.getToken as vi.Mock).mockResolvedValue("test-token");

    const [resData, error, pageInfo, status] = await fetchData("/test-endpoint");

    expect(axios.request).toHaveBeenCalledWith({
      url: "https://test-api.com/test-endpoint",
      method: "GET",
      headers: { Authorization: "Bearer test-token" },
      data: {},
      timeout: 360000,
      params: {},
    });
    expect(resData).toEqual({ result: "success" });
    expect(error).toBeNull();
    expect(pageInfo).toBeNull();
    expect(status).toBe(200);
  });

  it("should fire a header-less request when isAuthorized=true but no token is available", async () => {
    // Many indexer routes use `optionalAuthentication`, so a missing token must
    // not block the request — the backend responds as anonymous.
    const mockResponse = { data: { result: "public-ok" }, status: 200 };
    (axios.request as vi.Mock).mockResolvedValue(mockResponse);
    (TokenManager.getToken as vi.Mock).mockResolvedValue(null);

    const [resData, error, , status] = await fetchData("/test-endpoint");

    expect(axios.request).toHaveBeenCalledTimes(1);
    const calledWith = (axios.request as vi.Mock).mock.calls[0][0];
    expect(calledWith.headers.Authorization).toBeUndefined();
    expect(resData).toEqual({ result: "public-ok" });
    expect(error).toBeNull();
    expect(status).toBe(200);
  });

  it("should fire an anonymous request when isAuthorized=false even with no token", async () => {
    const mockResponse = { data: { result: "public" }, status: 200 };
    (axios.request as vi.Mock).mockResolvedValue(mockResponse);
    (TokenManager.getToken as vi.Mock).mockResolvedValue(null);

    const [resData, error, , status] = await fetchData("/test-endpoint", "GET", {}, {}, {}, false);

    expect(axios.request).toHaveBeenCalledTimes(1);
    const calledWith = (axios.request as vi.Mock).mock.calls[0][0];
    expect(calledWith.headers.Authorization).toBeUndefined();
    expect(TokenManager.getToken).not.toHaveBeenCalled();
    expect(resData).toEqual({ result: "public" });
    expect(error).toBeNull();
    expect(status).toBe(200);
  });

  it("should make an authorized POST request", async () => {
    const mockToken = "test-token";
    (TokenManager.getToken as vi.Mock).mockResolvedValue(mockToken);

    const mockResponse = {
      data: { result: "success", pageInfo: { page: 1 } },
      status: 200,
    };
    (axios.request as vi.Mock).mockResolvedValue(mockResponse);

    const [resData, error, pageInfo, status] = await fetchData(
      "/test-endpoint",
      "POST",
      { key: "value" },
      {},
      {},
      true
    );

    expect(axios.request).toHaveBeenCalledWith({
      url: "https://test-api.com/test-endpoint",
      method: "POST",
      headers: { Authorization: `Bearer ${mockToken}` },
      data: { key: "value" },
      timeout: 360000,
      params: {},
    });
    expect(resData).toEqual({ result: "success", pageInfo: { page: 1 } });
    expect(error).toBeNull();
    expect(pageInfo).toEqual({ page: 1 });
    expect(status).toBe(200);
  });

  it("should handle network errors", async () => {
    const mockError = new Error("Network Error");
    (axios.request as vi.Mock).mockRejectedValue(mockError);
    (TokenManager.getToken as vi.Mock).mockResolvedValue("test-token");

    const [resData, error, pageInfo, status] = await fetchData("/test-endpoint");

    expect(resData).toBeNull();
    // When there's no response, the implementation returns the error object itself
    expect(error).toBe(mockError);
    expect(pageInfo).toBeNull();
    // Default status for network errors without response
    expect(status).toBe(500);
  });

  it("should handle API errors", async () => {
    const mockError = {
      response: {
        data: {
          message: "Bad Request",
        },
        status: 400,
      },
    };
    (axios.request as vi.Mock).mockRejectedValue(mockError);
    (TokenManager.getToken as vi.Mock).mockResolvedValue("test-token");

    const [resData, error, pageInfo, status] = await fetchData("/test-endpoint");

    expect(resData).toBeNull();
    expect(error).toBe("Bad Request");
    expect(pageInfo).toBeNull();
    expect(status).toBe(400);
  });

  it("should return 404 status for not found errors", async () => {
    const mockError = {
      response: {
        data: {
          message: "Not Found",
        },
        status: 404,
      },
    };
    (axios.request as vi.Mock).mockRejectedValue(mockError);
    (TokenManager.getToken as vi.Mock).mockResolvedValue("test-token");

    const [resData, error, pageInfo, status] = await fetchData("/test-endpoint");

    expect(resData).toBeNull();
    expect(error).toBe("Not Found");
    expect(pageInfo).toBeNull();
    expect(status).toBe(404);
  });

  it("should return 500 status for server errors", async () => {
    const mockError = {
      response: {
        data: {
          message: "Internal Server Error",
        },
        status: 500,
      },
    };
    (axios.request as vi.Mock).mockRejectedValue(mockError);
    (TokenManager.getToken as vi.Mock).mockResolvedValue("test-token");

    const [resData, error, pageInfo, status] = await fetchData("/test-endpoint");

    expect(resData).toBeNull();
    expect(error).toBe("Internal Server Error");
    expect(pageInfo).toBeNull();
    expect(status).toBe(500);
  });

  it("should return 201 status for successful creation", async () => {
    const mockResponse = { data: { id: "123", created: true }, status: 201 };
    (axios.request as vi.Mock).mockResolvedValue(mockResponse);
    (TokenManager.getToken as vi.Mock).mockResolvedValue("test-token");

    const [resData, error, pageInfo, status] = await fetchData("/test-endpoint", "POST", {
      name: "test",
    });

    expect(resData).toEqual({ id: "123", created: true });
    expect(error).toBeNull();
    expect(pageInfo).toBeNull();
    expect(status).toBe(201);
  });

  it("should_forward_AbortSignal_to_axios_request_config", async () => {
    // Long-running polls need axios to abort an in-flight request the
    // moment the caller's signal aborts — otherwise the request
    // completes its current network round-trip before the loop's next
    // abort check fires.
    const mockResponse = { data: { ok: true }, status: 200 };
    (axios.request as vi.Mock).mockResolvedValue(mockResponse);
    (TokenManager.getToken as vi.Mock).mockResolvedValue("test-token");

    const controller = new AbortController();
    await fetchData("/test-endpoint", "GET", {}, {}, {}, true, false, undefined, controller.signal);

    expect(axios.request).toHaveBeenCalledWith(
      expect.objectContaining({ signal: controller.signal })
    );
  });

  it("retries once with a fresh token when an authorized indexer request returns 401", async () => {
    // Simulates the deferred-Privy auth race: the first request fired before the
    // token was ready and 401'd; a fresh token is now available and the retry
    // succeeds — instead of dead-ending as an empty result until a page refresh.
    const unauthorized = { response: { data: { message: "Unauthorized" }, status: 401 } };
    const okResponse = { data: { result: "recovered" }, status: 200 };
    (axios.request as vi.Mock)
      .mockRejectedValueOnce(unauthorized)
      .mockResolvedValueOnce(okResponse);
    (TokenManager.getToken as vi.Mock)
      .mockResolvedValueOnce("stale-token")
      .mockResolvedValueOnce("fresh-token");

    const [resData, error, , status] = await fetchData("/test-endpoint");

    expect(axios.request).toHaveBeenCalledTimes(2);
    expect(TokenManager.clearCache).toHaveBeenCalledTimes(1);
    const retryConfig = (axios.request as vi.Mock).mock.calls[1][0];
    expect(retryConfig.headers.Authorization).toBe("Bearer fresh-token");
    expect(resData).toEqual({ result: "recovered" });
    expect(error).toBeNull();
    expect(status).toBe(200);
  });

  it("does not retry a 401 when no fresh token is available", async () => {
    const unauthorized = { response: { data: { message: "Unauthorized" }, status: 401 } };
    (axios.request as vi.Mock).mockRejectedValue(unauthorized);
    (TokenManager.getToken as vi.Mock)
      .mockResolvedValueOnce("stale-token")
      .mockResolvedValueOnce(null);

    const [resData, error, , status] = await fetchData("/test-endpoint");

    expect(axios.request).toHaveBeenCalledTimes(1);
    expect(resData).toBeNull();
    expect(error).toBe("Unauthorized");
    expect(status).toBe(401);
  });

  it("does not retry a 401 for unauthorized (public) requests", async () => {
    const unauthorized = { response: { data: { message: "Unauthorized" }, status: 401 } };
    (axios.request as vi.Mock).mockRejectedValue(unauthorized);

    const [, , , status] = await fetchData("/test-endpoint", "GET", {}, {}, {}, false);

    expect(axios.request).toHaveBeenCalledTimes(1);
    expect(TokenManager.getToken).not.toHaveBeenCalled();
    expect(status).toBe(401);
  });
});
