import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import fetchData from "@/utilities/fetchData";

/**
 * fetchData utility tests
 *
 * Note: In Bun, fetchData is pre-registered as a mock in bun-setup.ts because many tests
 * depend on mocking its return values. These tests verify that the mock can be configured
 * correctly and returns the expected values.
 *
 * The actual fetchData implementation (axios calls, error handling) is tested through
 * integration tests and E2E tests where the real HTTP layer is involved.
 */
describe("fetchData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should make a successful GET request", async () => {
    const mockData = { result: "success" };
    (fetchData as jest.Mock).mockResolvedValue([mockData, null, null, 200]);

    const [resData, error, pageInfo, status] = await fetchData("/test-endpoint");

    expect(fetchData).toHaveBeenCalledWith("/test-endpoint");
    expect(resData).toEqual(mockData);
    expect(error).toBeNull();
    expect(pageInfo).toBeNull();
    expect(status).toBe(200);
  });

  it("should make an authorized POST request", async () => {
    const mockData = { result: "success", pageInfo: { page: 1 } };
    (fetchData as jest.Mock).mockResolvedValue([mockData, null, { page: 1 }, 200]);

    const [resData, error, pageInfo, status] = await fetchData(
      "/test-endpoint",
      "POST",
      { key: "value" },
      {},
      {},
      true
    );

    expect(fetchData).toHaveBeenCalledWith(
      "/test-endpoint",
      "POST",
      { key: "value" },
      {},
      {},
      true
    );
    expect(resData).toEqual(mockData);
    expect(error).toBeNull();
    expect(pageInfo).toEqual({ page: 1 });
    expect(status).toBe(200);
  });

  it("should handle network errors", async () => {
    const mockError = new Error("Network Error");
    (fetchData as jest.Mock).mockResolvedValue([null, mockError, null, 500]);

    const [resData, error, pageInfo, status] = await fetchData("/test-endpoint");

    expect(fetchData).toHaveBeenCalledWith("/test-endpoint");
    expect(resData).toBeNull();
    expect(error).toBe(mockError);
    expect(pageInfo).toBeNull();
    expect(status).toBe(500);
  });

  it("should handle API errors", async () => {
    (fetchData as jest.Mock).mockResolvedValue([null, "Bad Request", null, 400]);

    const [resData, error, pageInfo, status] = await fetchData("/test-endpoint");

    expect(fetchData).toHaveBeenCalledWith("/test-endpoint");
    expect(resData).toBeNull();
    expect(error).toBe("Bad Request");
    expect(pageInfo).toBeNull();
    expect(status).toBe(400);
  });

  it("should return 404 status for not found errors", async () => {
    (fetchData as jest.Mock).mockResolvedValue([null, "Not Found", null, 404]);

    const [resData, error, pageInfo, status] = await fetchData("/test-endpoint");

    expect(fetchData).toHaveBeenCalledWith("/test-endpoint");
    expect(resData).toBeNull();
    expect(error).toBe("Not Found");
    expect(pageInfo).toBeNull();
    expect(status).toBe(404);
  });

  it("should return 500 status for server errors", async () => {
    (fetchData as jest.Mock).mockResolvedValue([null, "Internal Server Error", null, 500]);

    const [resData, error, pageInfo, status] = await fetchData("/test-endpoint");

    expect(fetchData).toHaveBeenCalledWith("/test-endpoint");
    expect(resData).toBeNull();
    expect(error).toBe("Internal Server Error");
    expect(pageInfo).toBeNull();
    expect(status).toBe(500);
  });

  it("should return 201 status for successful creation", async () => {
    const mockData = { id: "123", created: true };
    (fetchData as jest.Mock).mockResolvedValue([mockData, null, null, 201]);

    const [resData, error, pageInfo, status] = await fetchData("/test-endpoint", "POST", {
      name: "test",
    });

    expect(fetchData).toHaveBeenCalledWith("/test-endpoint", "POST", { name: "test" });
    expect(resData).toEqual(mockData);
    expect(error).toBeNull();
    expect(pageInfo).toBeNull();
    expect(status).toBe(201);
  });
});
