import { getAuthToken } from "@dynamic-labs/sdk-react-core";
import { cookies } from "next/headers";
import {
  getDynamicJwtClient,
  getDynamicJwt,
  setDynamicJwtClient,
  clearDynamicJwt,
  getDynamicAuthHeader,
  refreshDynamicJwt,
  isDynamicAuthenticated,
  getDynamicUserInfo,
} from "@/utilities/auth/dynamicAuth";

// Mock dependencies
jest.mock("@dynamic-labs/sdk-react-core");
jest.mock("next/headers");

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock document.cookie
let documentCookieMock = "";
Object.defineProperty(document, "cookie", {
  get: jest.fn(() => documentCookieMock),
  set: jest.fn((value) => {
    documentCookieMock = value;
  }),
});

describe("Dynamic Auth Utilities", () => {
  const mockToken =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2lkIn0.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInZlcmlmaWVkX2NyZWRlbnRpYWxzIjpbeyJhZGRyZXNzIjoiMHgxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwIiwiY2hhaW4iOiJldGhlcmV1bSJ9XSwiZXhwIjo5OTk5OTk5OTk5LCJpYXQiOjE2MjAwMDAwMDB9.test-signature";

  beforeEach(() => {
    jest.clearAllMocks();
    documentCookieMock = "";
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    localStorageMock.removeItem.mockReset();
  });

  describe("getDynamicJwtServer", () => {
    it("should get token from cookies", async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: mockToken }),
      };
      (cookies as jest.Mock).mockReturnValue(mockCookieStore);

      const result = await getDynamicJwt();
      expect(result).toBe(mockToken);
      expect(mockCookieStore.get).toHaveBeenCalledWith("gap_dynamic_jwt");
    });

    it("should return null when cookie is not found", async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(null),
      };
      (cookies as jest.Mock).mockReturnValue(mockCookieStore);

      const result = await getDynamicJwt();
      expect(result).toBeNull();
    });

    it("should handle errors gracefully", async () => {
      (cookies as jest.Mock).mockImplementation(() => {
        throw new Error("Cookie error");
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await getDynamicJwt();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error retrieving Dynamic JWT from cookies:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("getDynamicJwtClient", () => {
    it("should get token from cookies first", async () => {
      documentCookieMock = `gap_dynamic_jwt=${encodeURIComponent(mockToken)}`;

      const result = await getDynamicJwtClient();
      expect(result).toBe(mockToken);
    });

    it("should get token from localStorage if not in cookies", async () => {
      documentCookieMock = "";
      localStorageMock.getItem.mockReturnValue(mockToken);

      const result = await getDynamicJwtClient();
      expect(result).toBe(mockToken);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        "dynamic_authentication_token"
      );
    });

    it("should get token from Dynamic SDK as last resort", async () => {
      documentCookieMock = "";
      localStorageMock.getItem.mockReturnValue(null);
      (getAuthToken as jest.Mock).mockReturnValue(mockToken);

      const result = await getDynamicJwtClient();
      expect(result).toBe(mockToken);
      expect(getAuthToken).toHaveBeenCalled();
    });

    it("should return null when no token is available", async () => {
      documentCookieMock = "";
      localStorageMock.getItem.mockReturnValue(null);
      (getAuthToken as jest.Mock).mockReturnValue(null);

      const result = await getDynamicJwtClient();
      expect(result).toBeNull();
    });
  });

  describe("setDynamicJwtClient", () => {
    it("should set token in both cookie and localStorage", () => {
      setDynamicJwtClient(mockToken);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "dynamic_authentication_token",
        mockToken
      );
      expect(document.cookie).toContain(
        `gap_dynamic_jwt=${encodeURIComponent(mockToken)}`
      );
      expect(document.cookie).toContain("path=/");
      expect(document.cookie).toContain("SameSite=Lax");
    });

    // it("should set Secure flag in production", () => {
    //   process.env.NODE_ENV = "production";

    //   setDynamicJwtClient(mockToken);

    //   expect(document.cookie).toContain("Secure");

    //   process.env.NODE_ENV = "test";
    // });
  });

  describe("clearDynamicJwt", () => {
    it("should clear both cookie and localStorage", () => {
      clearDynamicJwt();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "dynamic_authentication_token"
      );
      expect(document.cookie).toContain("gap_dynamic_jwt=;");
      expect(document.cookie).toContain(
        "expires=Thu, 01 Jan 1970 00:00:00 UTC"
      );
    });
  });

  describe("getDynamicAuthHeader", () => {
    it("should return authorization header with token", async () => {
      documentCookieMock = `gap_dynamic_jwt=${encodeURIComponent(mockToken)}`;

      const result = await getDynamicAuthHeader();
      expect(result).toEqual({
        authorization: `Bearer ${mockToken}`,
      });
    });

    it("should return empty object when no token", async () => {
      documentCookieMock = "";
      localStorageMock.getItem.mockReturnValue(null);
      (getAuthToken as jest.Mock).mockReturnValue(null);

      const result = await getDynamicAuthHeader();
      expect(result).toEqual({});
    });
  });

  describe("refreshDynamicJwt", () => {
    it("should clear existing tokens and get fresh one", async () => {
      (getAuthToken as jest.Mock).mockReturnValue(mockToken);

      const result = await refreshDynamicJwt();

      expect(localStorageMock.removeItem).toHaveBeenCalled();
      expect(getAuthToken).toHaveBeenCalled();
      expect(result).toBe(mockToken);
    });

    it("should return null when no fresh token available", async () => {
      (getAuthToken as jest.Mock).mockReturnValue(null);

      const result = await refreshDynamicJwt();
      expect(result).toBeNull();
    });
  });

  describe("isDynamicAuthenticated", () => {
    it("should return false when no token", async () => {
      documentCookieMock = "";
      localStorageMock.getItem.mockReturnValue(null);
      (getAuthToken as jest.Mock).mockReturnValue(null);

      const result = await isDynamicAuthenticated();
      expect(result).toBe(false);
    });

    it("should return true for valid token", async () => {
      documentCookieMock = `gap_dynamic_jwt=${encodeURIComponent(mockToken)}`;

      const result = await isDynamicAuthenticated();
      expect(result).toBe(true);
    });

    it("should return false for expired token", async () => {
      const expiredToken =
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.test";
      documentCookieMock = `gap_dynamic_jwt=${encodeURIComponent(
        expiredToken
      )}`;

      const result = await isDynamicAuthenticated();
      expect(result).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });

    it("should handle invalid token format", async () => {
      documentCookieMock = "gap_dynamic_jwt=invalid-token";

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await isDynamicAuthenticated();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("getDynamicUserInfo", () => {
    it("should return null when no token", async () => {
      documentCookieMock = "";
      localStorageMock.getItem.mockReturnValue(null);
      (getAuthToken as jest.Mock).mockReturnValue(null);

      const result = await getDynamicUserInfo();
      expect(result).toBeNull();
    });

    it("should extract user info from token", async () => {
      documentCookieMock = `gap_dynamic_jwt=${encodeURIComponent(mockToken)}`;

      const result = await getDynamicUserInfo();
      expect(result).toEqual({
        address: "0x1234567890123456789012345678901234567890",
        email: "test@example.com",
        userId: "user-123",
      });
    });

    it("should handle token without verified credentials", async () => {
      const tokenWithoutCreds =
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.test";
      documentCookieMock = `gap_dynamic_jwt=${encodeURIComponent(
        tokenWithoutCreds
      )}`;

      const result = await getDynamicUserInfo();
      expect(result).toEqual({
        address: undefined,
        email: "test@example.com",
        userId: "user-123",
      });
    });
  });
});
