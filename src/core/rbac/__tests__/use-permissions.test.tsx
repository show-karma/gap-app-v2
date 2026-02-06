import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { permissionsKeys, usePermissionsQuery } from "../hooks/use-permissions";
import { authorizationService } from "../services/authorization.service";
import { Permission } from "../types/permission";
import { Role } from "../types/role";

jest.mock("../services/authorization.service");

const mockService = authorizationService as jest.Mocked<typeof authorizationService>;

describe("usePermissions hooks", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("permissionsKeys", () => {
    it("should create correct all key", () => {
      expect(permissionsKeys.all).toEqual(["permissions"]);
    });

    it("should create correct context key with params", () => {
      const params = { programId: "program-123" };
      expect(permissionsKeys.context(params)).toEqual(["permissions", params]);
    });
  });

  describe("usePermissionsQuery", () => {
    it("should fetch permissions with default parameters", async () => {
      mockService.getPermissions.mockResolvedValue({
        roles: {
          primaryRole: Role.GUEST,
          roles: [Role.GUEST],
          reviewerTypes: [],
        },
        permissions: [Permission.COMMUNITY_VIEW, Permission.PROGRAM_VIEW],
        resourceContext: {},
      });

      const { result } = renderHook(() => usePermissionsQuery(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getPermissions).toHaveBeenCalledWith({});
      expect(result.current.data?.roles.primaryRole).toBe(Role.GUEST);
      expect(result.current.data?.permissions).toContain(Permission.COMMUNITY_VIEW);
    });

    it("should pass resource context to service", async () => {
      mockService.getPermissions.mockResolvedValue({
        roles: {
          primaryRole: Role.PROGRAM_ADMIN,
          roles: [Role.PROGRAM_ADMIN],
          reviewerTypes: [],
        },
        permissions: [Permission.PROGRAM_VIEW, Permission.PROGRAM_EDIT],
        resourceContext: { programId: "program-123" },
      });

      const params = {
        communityId: "community-456",
        programId: "program-123",
      };

      const { result } = renderHook(() => usePermissionsQuery(params), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getPermissions).toHaveBeenCalledWith(params);
      expect(result.current.data?.resourceContext.programId).toBe("program-123");
    });

    it("should handle loading state", async () => {
      mockService.getPermissions.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  roles: { primaryRole: Role.GUEST, roles: [Role.GUEST], reviewerTypes: [] },
                  permissions: [],
                  resourceContext: {},
                }),
              100
            )
          )
      );

      const { result } = renderHook(() => usePermissionsQuery(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should handle error state", async () => {
      mockService.getPermissions.mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() => usePermissionsQuery(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });

    it("should cache results", async () => {
      mockService.getPermissions.mockResolvedValue({
        roles: { primaryRole: Role.GUEST, roles: [Role.GUEST], reviewerTypes: [] },
        permissions: [],
        resourceContext: {},
      });

      const { result, rerender } = renderHook(() => usePermissionsQuery(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getPermissions).toHaveBeenCalledTimes(1);

      rerender();

      expect(mockService.getPermissions).toHaveBeenCalledTimes(1);
    });
  });
});
