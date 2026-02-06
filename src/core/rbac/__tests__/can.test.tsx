import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { AdminOnly, Can, Cannot, RequirePermission, RequireRole } from "../components/can";
import { PermissionProvider } from "../context/permission-context";
import { authorizationService } from "../services/authorization.service";
import { Permission } from "../types/permission";
import { ReviewerType, Role } from "../types/role";

jest.mock("../services/authorization.service");

const mockService = authorizationService as jest.Mocked<typeof authorizationService>;

describe("Can Components", () => {
  let queryClient: QueryClient;

  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <PermissionProvider>{children}</PermissionProvider>
    </QueryClientProvider>
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

  describe("Can component", () => {
    it("should render children when user has permission", async () => {
      mockService.getPermissions.mockResolvedValue({
        roles: { primaryRole: Role.PROGRAM_ADMIN, roles: [Role.PROGRAM_ADMIN], reviewerTypes: [] },
        permissions: [Permission.PROGRAM_VIEW, Permission.PROGRAM_EDIT],
        resourceContext: {},
      });

      render(
        <TestWrapper>
          <Can permission={Permission.PROGRAM_EDIT}>
            <div>Editable Content</div>
          </Can>
        </TestWrapper>
      );

      expect(await screen.findByText("Editable Content")).toBeInTheDocument();
    });

    it("should render fallback when user lacks permission", async () => {
      mockService.getPermissions.mockResolvedValue({
        roles: { primaryRole: Role.GUEST, roles: [Role.GUEST], reviewerTypes: [] },
        permissions: [Permission.COMMUNITY_VIEW],
        resourceContext: {},
      });

      render(
        <TestWrapper>
          <Can permission={Permission.PROGRAM_EDIT} fallback={<div>No Access</div>}>
            <div>Editable Content</div>
          </Can>
        </TestWrapper>
      );

      expect(await screen.findByText("No Access")).toBeInTheDocument();
      expect(screen.queryByText("Editable Content")).not.toBeInTheDocument();
    });

    it("should render children when user has any of multiple permissions", async () => {
      mockService.getPermissions.mockResolvedValue({
        roles: { primaryRole: Role.PROGRAM_ADMIN, roles: [Role.PROGRAM_ADMIN], reviewerTypes: [] },
        permissions: [Permission.PROGRAM_VIEW],
        resourceContext: {},
      });

      render(
        <TestWrapper>
          <Can permissions={[Permission.PROGRAM_EDIT, Permission.PROGRAM_VIEW]}>
            <div>Has Access</div>
          </Can>
        </TestWrapper>
      );

      expect(await screen.findByText("Has Access")).toBeInTheDocument();
    });

    it("should require all permissions when requireAll is true", async () => {
      mockService.getPermissions.mockResolvedValue({
        roles: { primaryRole: Role.PROGRAM_ADMIN, roles: [Role.PROGRAM_ADMIN], reviewerTypes: [] },
        permissions: [Permission.PROGRAM_VIEW],
        resourceContext: {},
      });

      render(
        <TestWrapper>
          <Can
            permissions={[Permission.PROGRAM_VIEW, Permission.PROGRAM_EDIT]}
            requireAll
            fallback={<div>Missing Permission</div>}
          >
            <div>Full Access</div>
          </Can>
        </TestWrapper>
      );

      expect(await screen.findByText("Missing Permission")).toBeInTheDocument();
    });

    it("should check role when role prop is provided", async () => {
      mockService.getPermissions.mockResolvedValue({
        roles: {
          primaryRole: Role.COMMUNITY_ADMIN,
          roles: [Role.COMMUNITY_ADMIN],
          reviewerTypes: [],
        },
        permissions: [],
        resourceContext: {},
      });

      render(
        <TestWrapper>
          <Can role={Role.COMMUNITY_ADMIN}>
            <div>Admin Content</div>
          </Can>
        </TestWrapper>
      );

      expect(await screen.findByText("Admin Content")).toBeInTheDocument();
    });

    it("should check role hierarchy when roleOrHigher is provided", async () => {
      mockService.getPermissions.mockResolvedValue({
        roles: { primaryRole: Role.SUPER_ADMIN, roles: [Role.SUPER_ADMIN], reviewerTypes: [] },
        permissions: [],
        resourceContext: {},
      });

      render(
        <TestWrapper>
          <Can roleOrHigher={Role.PROGRAM_ADMIN}>
            <div>Admin Content</div>
          </Can>
        </TestWrapper>
      );

      expect(await screen.findByText("Admin Content")).toBeInTheDocument();
    });
  });

  describe("Cannot component", () => {
    it("should render children when user lacks permission", async () => {
      mockService.getPermissions.mockResolvedValue({
        roles: { primaryRole: Role.GUEST, roles: [Role.GUEST], reviewerTypes: [] },
        permissions: [Permission.COMMUNITY_VIEW],
        resourceContext: {},
      });

      render(
        <TestWrapper>
          <Cannot permission={Permission.PROGRAM_EDIT}>
            <div>Guest Content</div>
          </Cannot>
        </TestWrapper>
      );

      expect(await screen.findByText("Guest Content")).toBeInTheDocument();
    });

    it("should not render children when user has permission", async () => {
      mockService.getPermissions.mockResolvedValue({
        roles: { primaryRole: Role.PROGRAM_ADMIN, roles: [Role.PROGRAM_ADMIN], reviewerTypes: [] },
        permissions: [Permission.PROGRAM_EDIT],
        resourceContext: {},
      });

      render(
        <TestWrapper>
          <Cannot permission={Permission.PROGRAM_EDIT}>
            <div>Guest Content</div>
          </Cannot>
        </TestWrapper>
      );

      await screen.findByText("Guest Content").catch(() => {});
      expect(screen.queryByText("Guest Content")).not.toBeInTheDocument();
    });
  });

  describe("RequirePermission component", () => {
    it("should render children when permission is present", async () => {
      mockService.getPermissions.mockResolvedValue({
        roles: { primaryRole: Role.PROGRAM_ADMIN, roles: [Role.PROGRAM_ADMIN], reviewerTypes: [] },
        permissions: [Permission.APPLICATION_APPROVE],
        resourceContext: {},
      });

      render(
        <TestWrapper>
          <RequirePermission permission={Permission.APPLICATION_APPROVE}>
            <div>Approve Button</div>
          </RequirePermission>
        </TestWrapper>
      );

      expect(await screen.findByText("Approve Button")).toBeInTheDocument();
    });
  });

  describe("RequireRole component", () => {
    it("should render children when user has exact role", async () => {
      mockService.getPermissions.mockResolvedValue({
        roles: { primaryRole: Role.PROGRAM_ADMIN, roles: [Role.PROGRAM_ADMIN], reviewerTypes: [] },
        permissions: [],
        resourceContext: {},
      });

      render(
        <TestWrapper>
          <RequireRole role={Role.PROGRAM_ADMIN}>
            <div>Admin Panel</div>
          </RequireRole>
        </TestWrapper>
      );

      expect(await screen.findByText("Admin Panel")).toBeInTheDocument();
    });

    it("should check role hierarchy when orHigher is true", async () => {
      mockService.getPermissions.mockResolvedValue({
        roles: { primaryRole: Role.SUPER_ADMIN, roles: [Role.SUPER_ADMIN], reviewerTypes: [] },
        permissions: [],
        resourceContext: {},
      });

      render(
        <TestWrapper>
          <RequireRole role={Role.PROGRAM_ADMIN} orHigher>
            <div>Admin Panel</div>
          </RequireRole>
        </TestWrapper>
      );

      expect(await screen.findByText("Admin Panel")).toBeInTheDocument();
    });
  });

  describe("AdminOnly component", () => {
    it("should render for program admin by default", async () => {
      mockService.getPermissions.mockResolvedValue({
        roles: { primaryRole: Role.PROGRAM_ADMIN, roles: [Role.PROGRAM_ADMIN], reviewerTypes: [] },
        permissions: [],
        resourceContext: {},
      });

      render(
        <TestWrapper>
          <AdminOnly>
            <div>Admin Section</div>
          </AdminOnly>
        </TestWrapper>
      );

      expect(await screen.findByText("Admin Section")).toBeInTheDocument();
    });

    it("should render for community admin when level is community", async () => {
      mockService.getPermissions.mockResolvedValue({
        roles: {
          primaryRole: Role.COMMUNITY_ADMIN,
          roles: [Role.COMMUNITY_ADMIN],
          reviewerTypes: [],
        },
        permissions: [],
        resourceContext: {},
      });

      render(
        <TestWrapper>
          <AdminOnly level="community">
            <div>Community Admin Section</div>
          </AdminOnly>
        </TestWrapper>
      );

      expect(await screen.findByText("Community Admin Section")).toBeInTheDocument();
    });

    it("should render for super admin when level is super", async () => {
      mockService.getPermissions.mockResolvedValue({
        roles: { primaryRole: Role.SUPER_ADMIN, roles: [Role.SUPER_ADMIN], reviewerTypes: [] },
        permissions: [],
        resourceContext: {},
      });

      render(
        <TestWrapper>
          <AdminOnly level="super">
            <div>Super Admin Section</div>
          </AdminOnly>
        </TestWrapper>
      );

      expect(await screen.findByText("Super Admin Section")).toBeInTheDocument();
    });

    it("should not render for lower roles", async () => {
      mockService.getPermissions.mockResolvedValue({
        roles: { primaryRole: Role.APPLICANT, roles: [Role.APPLICANT], reviewerTypes: [] },
        permissions: [],
        resourceContext: {},
      });

      render(
        <TestWrapper>
          <AdminOnly fallback={<div>Not Authorized</div>}>
            <div>Admin Section</div>
          </AdminOnly>
        </TestWrapper>
      );

      expect(await screen.findByText("Not Authorized")).toBeInTheDocument();
      expect(screen.queryByText("Admin Section")).not.toBeInTheDocument();
    });
  });
});
