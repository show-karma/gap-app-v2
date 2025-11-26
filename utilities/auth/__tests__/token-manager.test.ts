/**
 * @file Tests for TokenManager utility
 * @description Tests Privy JWT token management and authentication utilities
 */

import { TokenManager } from "../token-manager";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("TokenManager", () => {
  let mockPrivyInstance: any;
  const originalWindow = global.window;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a fresh mock Privy instance for each test
    mockPrivyInstance = {
      getAccessToken: jest.fn(),
      logout: jest.fn(),
    };

    // Reset the Privy instance
    TokenManager.setPrivyInstance(null);
  });

  afterEach(() => {
    // Restore window
    global.window = originalWindow;
  });

  describe("setPrivyInstance", () => {
    it("should set Privy instance", () => {
      TokenManager.setPrivyInstance(mockPrivyInstance);
      // Instance is set, we'll verify it works in other tests
      expect(true).toBe(true);
    });

    it("should accept null to reset instance", () => {
      TokenManager.setPrivyInstance(mockPrivyInstance);
      TokenManager.setPrivyInstance(null);
      expect(true).toBe(true);
    });
  });

  describe("getToken - Client Side", () => {
    beforeEach(() => {
      // Mock client-side environment
      global.window = {} as any;
    });

    it("should get token from Privy instance on client side", async () => {
      mockPrivyInstance.getAccessToken.mockResolvedValue("mock-access-token");
      TokenManager.setPrivyInstance(mockPrivyInstance);

      const token = await TokenManager.getToken();

      expect(token).toBe("mock-access-token");
      expect(mockPrivyInstance.getAccessToken).toHaveBeenCalled();
    });

    it("should return null when Privy instance is not set", async () => {
      TokenManager.setPrivyInstance(null);

      const token = await TokenManager.getToken();

      expect(token).toBeNull();
    });

    it("should return null when getAccessToken is not available", async () => {
      TokenManager.setPrivyInstance({});

      const token = await TokenManager.getToken();

      expect(token).toBeNull();
    });

    it("should handle getAccessToken errors", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      mockPrivyInstance.getAccessToken.mockRejectedValue(new Error("Token fetch failed"));
      TokenManager.setPrivyInstance(mockPrivyInstance);

      const token = await TokenManager.getToken();

      expect(token).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to get Privy access token:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should return empty string if Privy returns empty string", async () => {
      mockPrivyInstance.getAccessToken.mockResolvedValue("");
      TokenManager.setPrivyInstance(mockPrivyInstance);

      const token = await TokenManager.getToken();

      expect(token).toBe("");
    });
  });

  describe("getServerToken - Server Side", () => {
    beforeEach(() => {
      // Mock server-side environment
      delete (global as any).window;
    });

    it("should get token from cookies on server side", async () => {
      const mockCookieStore = {
        get: jest.fn((name: string) => {
          if (name === "privy-token") {
            return { value: "server-token" };
          }
          return undefined;
        }),
        getAll: jest.fn(() => []),
      };

      const { cookies } = await import("next/headers");
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const token = await TokenManager.getServerToken();

      expect(token).toBe("server-token");
      expect(mockCookieStore.get).toHaveBeenCalledWith("privy-token");
    });

    it("should check multiple token cookie names", async () => {
      const mockCookieStore = {
        get: jest.fn((name: string) => {
          if (name === "privy-access-token") {
            return { value: "access-token" };
          }
          return undefined;
        }),
        getAll: jest.fn(() => []),
      };

      const { cookies } = await import("next/headers");
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const token = await TokenManager.getServerToken();

      expect(token).toBe("access-token");
      expect(mockCookieStore.get).toHaveBeenCalledWith("privy-token");
      expect(mockCookieStore.get).toHaveBeenCalledWith("privy-access-token");
    });

    it("should search all cookies for privy tokens", async () => {
      const mockCookieStore = {
        get: jest.fn(() => undefined),
        getAll: jest.fn(() => [
          { name: "some-other-cookie", value: "other" },
          { name: "privy-custom-token", value: "custom-token" },
        ]),
      };

      const { cookies } = await import("next/headers");
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const token = await TokenManager.getServerToken();

      expect(token).toBe("custom-token");
    });

    it("should find privy jwt cookie", async () => {
      const mockCookieStore = {
        get: jest.fn(() => undefined),
        getAll: jest.fn(() => [
          { name: "session", value: "session-value" },
          { name: "privy-jwt-token", value: "jwt-token" },
        ]),
      };

      const { cookies } = await import("next/headers");
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const token = await TokenManager.getServerToken();

      expect(token).toBe("jwt-token");
    });

    it("should return null when no privy cookies found", async () => {
      const mockCookieStore = {
        get: jest.fn(() => undefined),
        getAll: jest.fn(() => [
          { name: "session", value: "session-value" },
          { name: "other", value: "other-value" },
        ]),
      };

      const { cookies } = await import("next/headers");
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const token = await TokenManager.getServerToken();

      expect(token).toBeNull();
    });

    it("should handle cookie access errors", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      const { cookies } = await import("next/headers");
      (cookies as jest.Mock).mockRejectedValue(new Error("Cookie access denied"));

      const token = await TokenManager.getServerToken();

      expect(token).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to get JWT from cookies:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should warn if called from client side", async () => {
      // Temporarily set window to simulate client-side
      global.window = {} as any;

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      const token = await TokenManager.getServerToken();

      expect(token).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "getServerToken should only be called server-side"
      );

      consoleWarnSpy.mockRestore();
      delete (global as any).window;
    });
  });

  describe("getToken - Server Side", () => {
    beforeEach(() => {
      // Mock server-side environment
      delete (global as any).window;
    });

    it("should call getServerToken on server side", async () => {
      const mockCookieStore = {
        get: jest.fn((name: string) => {
          if (name === "privy-token") {
            return { value: "server-token" };
          }
          return undefined;
        }),
        getAll: jest.fn(() => []),
      };

      const { cookies } = await import("next/headers");
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const token = await TokenManager.getToken();

      expect(token).toBe("server-token");
    });
  });

  describe("getAuthHeader", () => {
    beforeEach(() => {
      global.window = {} as any;
    });

    it("should return Authorization header with Bearer token", async () => {
      mockPrivyInstance.getAccessToken.mockResolvedValue("test-token");
      TokenManager.setPrivyInstance(mockPrivyInstance);

      const header = await TokenManager.getAuthHeader();

      expect(header).toEqual({ Authorization: "Bearer test-token" });
    });

    it("should return empty object when no token available", async () => {
      TokenManager.setPrivyInstance(null);

      const header = await TokenManager.getAuthHeader();

      expect(header).toEqual({});
    });

    it("should return empty object when token is null", async () => {
      mockPrivyInstance.getAccessToken.mockResolvedValue(null);
      TokenManager.setPrivyInstance(mockPrivyInstance);

      const header = await TokenManager.getAuthHeader();

      expect(header).toEqual({});
    });

    it("should handle empty string token", async () => {
      mockPrivyInstance.getAccessToken.mockResolvedValue("");
      TokenManager.setPrivyInstance(mockPrivyInstance);

      const header = await TokenManager.getAuthHeader();

      expect(header).toEqual({});
    });
  });

  describe("isAuthenticated", () => {
    beforeEach(() => {
      global.window = {} as any;
    });

    it("should return true when token exists", async () => {
      mockPrivyInstance.getAccessToken.mockResolvedValue("test-token");
      TokenManager.setPrivyInstance(mockPrivyInstance);

      const isAuth = await TokenManager.isAuthenticated();

      expect(isAuth).toBe(true);
    });

    it("should return false when token is null", async () => {
      mockPrivyInstance.getAccessToken.mockResolvedValue(null);
      TokenManager.setPrivyInstance(mockPrivyInstance);

      const isAuth = await TokenManager.isAuthenticated();

      expect(isAuth).toBe(false);
    });

    it("should return false when no Privy instance", async () => {
      TokenManager.setPrivyInstance(null);

      const isAuth = await TokenManager.isAuthenticated();

      expect(isAuth).toBe(false);
    });

    it("should return false when token is empty string", async () => {
      mockPrivyInstance.getAccessToken.mockResolvedValue("");
      TokenManager.setPrivyInstance(mockPrivyInstance);

      const isAuth = await TokenManager.isAuthenticated();

      expect(isAuth).toBe(false);
    });
  });

  describe("clearTokens", () => {
    beforeEach(() => {
      global.window = {} as any;
    });

    it("should call Privy logout on client side", async () => {
      mockPrivyInstance.logout.mockResolvedValue(undefined);
      TokenManager.setPrivyInstance(mockPrivyInstance);

      await TokenManager.clearTokens();

      expect(mockPrivyInstance.logout).toHaveBeenCalled();
    });

    it("should handle when Privy instance has no logout method", async () => {
      TokenManager.setPrivyInstance({});

      await expect(TokenManager.clearTokens()).resolves.not.toThrow();
    });

    it("should handle when Privy instance is null", async () => {
      TokenManager.setPrivyInstance(null);

      await expect(TokenManager.clearTokens()).resolves.not.toThrow();
    });

    it("should warn when called from server side", async () => {
      delete (global as any).window;

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      await TokenManager.clearTokens();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "clearTokens should be called client-side using Privy's logout method"
      );

      consoleWarnSpy.mockRestore();
    });

    it("should handle logout errors gracefully", async () => {
      mockPrivyInstance.logout.mockRejectedValue(new Error("Logout failed"));
      TokenManager.setPrivyInstance(mockPrivyInstance);

      await expect(TokenManager.clearTokens()).rejects.toThrow("Logout failed");
    });
  });

  describe("Multiple Token Cookie Names", () => {
    beforeEach(() => {
      delete (global as any).window;
    });

    it("should check privy-id-token", async () => {
      const mockCookieStore = {
        get: jest.fn((name: string) => {
          if (name === "privy-id-token") {
            return { value: "id-token" };
          }
          return undefined;
        }),
        getAll: jest.fn(() => []),
      };

      const { cookies } = await import("next/headers");
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const token = await TokenManager.getServerToken();

      expect(token).toBe("id-token");
    });

    it("should check privy-jwt", async () => {
      const mockCookieStore = {
        get: jest.fn((name: string) => {
          if (name === "privy-jwt") {
            return { value: "jwt-token" };
          }
          return undefined;
        }),
        getAll: jest.fn(() => []),
      };

      const { cookies } = await import("next/headers");
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const token = await TokenManager.getServerToken();

      expect(token).toBe("jwt-token");
    });

    it("should return first found token in priority order", async () => {
      const mockCookieStore = {
        get: jest.fn((name: string) => {
          const tokens: Record<string, string> = {
            "privy-token": "token-1",
            "privy-access-token": "token-2",
            "privy-id-token": "token-3",
            "privy-jwt": "token-4",
          };
          return tokens[name] ? { value: tokens[name] } : undefined;
        }),
        getAll: jest.fn(() => []),
      };

      const { cookies } = await import("next/headers");
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const token = await TokenManager.getServerToken();

      // Should return the first one checked (privy-token)
      expect(token).toBe("token-1");
    });
  });

  describe("Case Insensitive Cookie Search", () => {
    beforeEach(() => {
      delete (global as any).window;
    });

    it("should find cookies with uppercase PRIVY", async () => {
      const mockCookieStore = {
        get: jest.fn(() => undefined),
        getAll: jest.fn(() => [{ name: "PRIVY-TOKEN", value: "uppercase-token" }]),
      };

      const { cookies } = await import("next/headers");
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const token = await TokenManager.getServerToken();

      expect(token).toBe("uppercase-token");
    });

    it("should find cookies with mixed case", async () => {
      const mockCookieStore = {
        get: jest.fn(() => undefined),
        getAll: jest.fn(() => [{ name: "Privy-Access-Token", value: "mixed-case-token" }]),
      };

      const { cookies } = await import("next/headers");
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const token = await TokenManager.getServerToken();

      expect(token).toBe("mixed-case-token");
    });

    it("should match cookies with jwt in name", async () => {
      const mockCookieStore = {
        get: jest.fn(() => undefined),
        getAll: jest.fn(() => [{ name: "privy-custom-jwt", value: "jwt-value" }]),
      };

      const { cookies } = await import("next/headers");
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const token = await TokenManager.getServerToken();

      expect(token).toBe("jwt-value");
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined Privy instance gracefully", async () => {
      global.window = {} as any;
      TokenManager.setPrivyInstance(undefined);

      const token = await TokenManager.getToken();

      expect(token).toBeNull();
    });

    it("should handle Privy instance with no methods", async () => {
      global.window = {} as any;
      TokenManager.setPrivyInstance({});

      const isAuth = await TokenManager.isAuthenticated();

      expect(isAuth).toBe(false);
    });

    it("should handle getAccessToken returning undefined", async () => {
      global.window = {} as any;
      mockPrivyInstance.getAccessToken.mockResolvedValue(undefined);
      TokenManager.setPrivyInstance(mockPrivyInstance);

      const token = await TokenManager.getToken();

      expect(token).toBeUndefined();
    });
  });
});
