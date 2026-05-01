/**
 * MSW integration tests for useGranteeContacts hook.
 *
 * The hook fetches grantee contacts via granteeContactsService which calls
 * fetchData (axios) against /v2/funding-applications/:referenceNumber/grantee-contacts.
 * Authentication is required — the hook is disabled when unauthenticated.
 */

import { waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useGranteeContacts } from "@/hooks/useGranteeContacts";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    authenticated: true,
    address: "0x1234567890abcdef1234567890abcdef12345678",
    ready: true,
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn(),
    isConnected: true,
  }),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({}),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/test",
  useSearchParams: () => new URLSearchParams(),
}));

installMswLifecycle();

const REF_NUMBER = "APP-001";

const MOCK_CONTACTS = [
  {
    kind: "applicant",
    role: "Owner",
    email: "alice@example.com",
    name: "Alice",
    address: "0xabc123",
  },
  {
    kind: "member",
    role: "Member",
    email: "bob@example.com",
    name: "Bob",
    address: "0xdef456",
  },
];

describe("useGranteeContacts (MSW integration)", () => {
  describe("loading state", () => {
    it("returns loading state initially", () => {
      const { result } = renderHookWithProviders(() => useGranteeContacts(REF_NUMBER));
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("success state", () => {
    it("returns contacts on success", async () => {
      server.use(
        http.get("*/v2/funding-applications/:referenceNumber/grantee-contacts", () =>
          HttpResponse.json({ contacts: MOCK_CONTACTS })
        )
      );

      const { result } = renderHookWithProviders(() => useGranteeContacts(REF_NUMBER));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data![0].name).toBe("Alice");
      expect(result.current.data![0].email).toBe("alice@example.com");
      expect(result.current.data![0].kind).toBe("applicant");
      expect(result.current.data![0].role).toBe("Owner");
      expect(result.current.data![1].name).toBe("Bob");
      expect(result.current.isError).toBe(false);
    });

    it("returns empty array for empty contacts list", async () => {
      server.use(
        http.get("*/v2/funding-applications/:referenceNumber/grantee-contacts", () =>
          HttpResponse.json({ contacts: [] })
        )
      );

      const { result } = renderHookWithProviders(() => useGranteeContacts(REF_NUMBER));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isError).toBe(false);
    });
  });

  describe("error state", () => {
    it("returns error on 500", async () => {
      server.use(
        http.get("*/v2/funding-applications/:referenceNumber/grantee-contacts", () =>
          HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
      );

      const { result } = renderHookWithProviders(() => useGranteeContacts(REF_NUMBER));

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.data).toBeUndefined();
    });
  });

  describe("disabled state", () => {
    it("does not fetch when referenceNumber is undefined", () => {
      const { result } = renderHookWithProviders(() => useGranteeContacts(undefined));
      // enabled: !!referenceNumber && authenticated is false
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it("does not fetch when referenceNumber is empty string", () => {
      const { result } = renderHookWithProviders(() => useGranteeContacts(""));
      expect(result.current.isLoading).toBe(false);
    });
  });
});
