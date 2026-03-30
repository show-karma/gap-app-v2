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

  it("should make a successful GET request", async () => {
    const mockResponse = { data: { result: "success" }, status: 200 };
    (axios.request as vi.Mock).mockResolvedValue(mockResponse);
    (TokenManager.getToken as vi.Mock).mockResolvedValue(null);

    const [resData, error, pageInfo, status] = await fetchData("/test-endpoint");

    expect(axios.request).toHaveBeenCalledWith({
      url: "https://test-api.com/test-endpoint",
      method: "GET",
      headers: {},
      data: {},
      timeout: 360000,
      params: {},
    });
    expect(resData).toEqual({ result: "success" });
    expect(error).toBeNull();
    expect(pageInfo).toBeNull();
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
    (TokenManager.getToken as vi.Mock).mockResolvedValue(null);

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
    (TokenManager.getToken as vi.Mock).mockResolvedValue(null);

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
    (TokenManager.getToken as vi.Mock).mockResolvedValue(null);

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
});
