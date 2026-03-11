/**
 * Tests for ApplicationAccessRole values and useApplicationAccess behavior.
 *
 * ApplicationAccessRole is defined in:
 *   src/features/applications/hooks/use-application-access.ts
 *
 * Valid values (matching backend contract):
 *   "SUPER_ADMIN" | "COMMUNITY_ADMIN" | "PROGRAM_REVIEWER" |
 *   "MILESTONE_REVIEWER" | "APPLICANT" | "GUEST" | "NONE"
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  ApplicationAccessError,
  useApplicationAccess,
} from "@/src/features/applications/hooks/use-application-access";
import fetchData from "@/utilities/fetchData";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn().mockReturnValue({
    authenticated: true,
    ready: true,
  }),
}));

jest.mock("@/utilities/fetchData");
const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;

const ALL_ACCESS_ROLES = [
  "SUPER_ADMIN",
  "COMMUNITY_ADMIN",
  "PROGRAM_REVIEWER",
  "MILESTONE_REVIEWER",
  "APPLICANT",
  "GUEST",
  "NONE",
] as const;

type AccessRole = (typeof ALL_ACCESS_ROLES)[number];

const makeAccessInfo = (accessRole: AccessRole) => ({
  canView: accessRole !== "NONE",
  canEdit: accessRole === "SUPER_ADMIN" || accessRole === "COMMUNITY_ADMIN",
  canReview:
    accessRole === "PROGRAM_REVIEWER" ||
    accessRole === "MILESTONE_REVIEWER" ||
    accessRole === "COMMUNITY_ADMIN" ||
    accessRole === "SUPER_ADMIN",
  canAdminister: accessRole === "SUPER_ADMIN" || accessRole === "COMMUNITY_ADMIN",
  isOwner: accessRole === "APPLICANT",
  accessRole,
});

describe("ApplicationAccessRole", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("valid accessRole values match backend contract", () => {
    it.each(ALL_ACCESS_ROLES)("correctly handles accessRole = %s", async (role) => {
      const accessInfo = makeAccessInfo(role);
      mockFetchData.mockResolvedValue([accessInfo, null, undefined, 200]);

      const { result } = renderHook(() => useApplicationAccess("optimism", "REF-001"), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.accessRole).toBe(role);
    });
  });

  describe("default state", () => {
    it("defaults accessRole to NONE when no accessInfo is available", () => {
      // Don't provide a referenceNumber — query won't fire
      const { result } = renderHook(() => useApplicationAccess("optimism", undefined), { wrapper });

      expect(result.current.accessRole).toBe("NONE");
    });

    it("defaults all permission flags to false when no accessInfo", () => {
      const { result } = renderHook(() => useApplicationAccess("optimism", undefined), { wrapper });

      expect(result.current.canView).toBe(false);
      expect(result.current.canEdit).toBe(false);
      expect(result.current.canReview).toBe(false);
      expect(result.current.canAdminister).toBe(false);
      expect(result.current.isOwner).toBe(false);
    });
  });

  describe("permission flags by role", () => {
    it("SUPER_ADMIN can view, edit, review, and administer", async () => {
      mockFetchData.mockResolvedValue([makeAccessInfo("SUPER_ADMIN"), null, undefined, 200]);

      const { result } = renderHook(() => useApplicationAccess("optimism", "REF-001"), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canView).toBe(true);
      expect(result.current.canEdit).toBe(true);
      expect(result.current.canAdminister).toBe(true);
    });

    it("APPLICANT is marked as owner", async () => {
      mockFetchData.mockResolvedValue([makeAccessInfo("APPLICANT"), null, undefined, 200]);

      const { result } = renderHook(() => useApplicationAccess("optimism", "REF-001"), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isOwner).toBe(true);
    });

    it("NONE cannot view, edit, review, or administer", async () => {
      mockFetchData.mockResolvedValue([makeAccessInfo("NONE"), null, undefined, 200]);

      const { result } = renderHook(() => useApplicationAccess("optimism", "REF-001"), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canView).toBe(false);
      expect(result.current.canEdit).toBe(false);
      expect(result.current.canReview).toBe(false);
      expect(result.current.canAdminister).toBe(false);
    });
  });

  describe("error handling", () => {
    it("returns ApplicationAccessError with code NETWORK on 5xx", async () => {
      mockFetchData.mockResolvedValue([null, "Server error", undefined, 500]);

      const { result } = renderHook(() => useApplicationAccess("optimism", "REF-001"), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeInstanceOf(ApplicationAccessError);
      expect(result.current.error?.code).toBe("NETWORK");
    });

    it("returns ApplicationAccessError with code AUTH on 401", async () => {
      mockFetchData.mockResolvedValue([null, "Unauthorized", undefined, 401]);

      const { result } = renderHook(() => useApplicationAccess("optimism", "REF-001"), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeInstanceOf(ApplicationAccessError);
      expect(result.current.error?.code).toBe("AUTH");
    });

    it("returns ApplicationAccessError with code NOT_FOUND on 404", async () => {
      mockFetchData.mockResolvedValue([null, "Not found", undefined, 404]);

      const { result } = renderHook(() => useApplicationAccess("optimism", "REF-001"), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeInstanceOf(ApplicationAccessError);
      expect(result.current.error?.code).toBe("NOT_FOUND");
    });
  });

  describe("ApplicationAccessError factory methods", () => {
    it("network() creates error with NETWORK code", () => {
      const err = ApplicationAccessError.network("Connection failed");
      expect(err).toBeInstanceOf(ApplicationAccessError);
      expect(err.code).toBe("NETWORK");
      expect(err.message).toBe("Connection failed");
    });

    it("auth() creates error with AUTH code", () => {
      const err = ApplicationAccessError.auth("Unauthorized");
      expect(err.code).toBe("AUTH");
    });

    it("notFound() creates error with NOT_FOUND code", () => {
      const err = ApplicationAccessError.notFound("Not found");
      expect(err.code).toBe("NOT_FOUND");
    });

    it("unknown() creates error with UNKNOWN code", () => {
      const err = ApplicationAccessError.unknown("Something went wrong");
      expect(err.code).toBe("UNKNOWN");
    });
  });
});
