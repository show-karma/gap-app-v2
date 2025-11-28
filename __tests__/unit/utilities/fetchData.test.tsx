import axios from "axios";
import { TokenManager } from "@/utilities/auth/token-manager";
import fetchData from "@/utilities/fetchData";

jest.mock("axios");
jest.mock("@/utilities/auth/token-manager");
jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "https://test-api.com",
  },
}));
jest.mock("@/utilities/sanitize", () => ({
  sanitizeObject: jest.fn((data) => data),
}));

describe("fetchData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should make a successful GET request", async () => {
    const mockResponse = { data: { result: "success" }, status: 200 };
    (axios.request as jest.Mock).mockResolvedValue(mockResponse);
    (TokenManager.getToken as jest.Mock).mockResolvedValue(null);

    const [resData, error, pageInfo] = await fetchData("/test-endpoint");

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
  });

  it("should make an authorized POST request", async () => {
    const mockToken = "test-token";
    (TokenManager.getToken as jest.Mock).mockResolvedValue(mockToken);

    const mockResponse = {
      data: { result: "success", pageInfo: { page: 1 } },
      status: 200,
    };
    (axios.request as jest.Mock).mockResolvedValue(mockResponse);

    const [resData, error, pageInfo] = await fetchData(
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
  });

  it("should handle network errors", async () => {
    const mockError = new Error("Network Error");
    (axios.request as jest.Mock).mockRejectedValue(mockError);
    (TokenManager.getToken as jest.Mock).mockResolvedValue(null);

    const [resData, error, pageInfo] = await fetchData("/test-endpoint");

    expect(resData).toBeNull();
    // When there's no response, the implementation returns the error object itself
    expect(error).toBe(mockError);
    expect(pageInfo).toBeUndefined();
  });

  it("should handle API errors", async () => {
    const mockError = {
      response: {
        data: {
          message: "Bad Request",
        },
      },
    };
    (axios.request as jest.Mock).mockRejectedValue(mockError);

    const [resData, error, pageInfo] = await fetchData("/test-endpoint");

    expect(resData).toBeNull();
    expect(error).toBe("Bad Request");
    expect(pageInfo).toBeUndefined();
  });
});
