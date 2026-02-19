import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { AdminOnly, Can, Cannot, RequirePermission, RequireRole } from "../components/can";
import { hasAllPermissions, hasAnyPermission, hasPermission } from "../policies/permission-matrix";
import { Permission } from "../types/permission";
import type { PermissionContextValue, ResourceContext } from "../types/resource";
import type { UserRoles } from "../types/role";
import { isRoleAtLeast, isValidRole, ReviewerType, Role } from "../types/role";

// Mock the permission context hook directly instead of going through PermissionProvider
// This isolates the Can component tests from auth/query concerns
const mockContextValue: PermissionContextValue = {
  roles: { primaryRole: Role.GUEST, roles: [Role.GUEST], reviewerTypes: [] },
  permissions: [],
  isLoading: false,
  isGuestDueToError: false,
  resourceContext: {},
  isCommunityAdmin: false,
  isProgramAdmin: false,
  isReviewer: false,
  isRegistryAdmin: false,
  isProgramCreator: false,
  can: () => false,
  canAny: () => false,
  canAll: () => false,
  hasRole: () => false,
  hasRoleOrHigher: () => false,
  isReviewerType: () => false,
};

jest.mock("../context/permission-context", () => ({
  usePermissionContext: () => mockContextValue,
}));

function setMockContext(overrides: {
  roles: UserRoles;
  permissions: Permission[];
  isReviewer?: boolean;
  isCommunityAdmin?: boolean;
  isProgramAdmin?: boolean;
  isRegistryAdmin?: boolean;
  isProgramCreator?: boolean;
}) {
  const perms = overrides.permissions;
  const roles = overrides.roles;
  mockContextValue.roles = roles;
  mockContextValue.permissions = perms;
  mockContextValue.isLoading = false;
  mockContextValue.isGuestDueToError = false;
  mockContextValue.isReviewer = overrides.isReviewer ?? false;
  mockContextValue.isCommunityAdmin = overrides.isCommunityAdmin ?? false;
  mockContextValue.isProgramAdmin = overrides.isProgramAdmin ?? false;
  mockContextValue.isRegistryAdmin = overrides.isRegistryAdmin ?? false;
  mockContextValue.isProgramCreator = overrides.isProgramCreator ?? false;
  mockContextValue.can = (permission: Permission) => hasPermission(perms, permission);
  mockContextValue.canAny = (permissions: Permission[]) => hasAnyPermission(perms, permissions);
  mockContextValue.canAll = (permissions: Permission[]) => hasAllPermissions(perms, permissions);
  mockContextValue.hasRole = (role: string) => isValidRole(role) && roles.roles.includes(role);
  mockContextValue.hasRoleOrHigher = (role: string) =>
    isValidRole(role) && isRoleAtLeast(roles.primaryRole, role);
  mockContextValue.isReviewerType = (type: ReviewerType) =>
    roles.reviewerTypes?.includes(type) ?? false;
}

describe("Can Components", () => {
  beforeEach(() => {
    // Reset to guest defaults
    setMockContext({
      roles: { primaryRole: Role.GUEST, roles: [Role.GUEST], reviewerTypes: [] },
      permissions: [],
    });
  });

  describe("Can component", () => {
    it("should render children when user has permission", () => {
      setMockContext({
        roles: { primaryRole: Role.PROGRAM_ADMIN, roles: [Role.PROGRAM_ADMIN], reviewerTypes: [] },
        permissions: [Permission.PROGRAM_VIEW, Permission.PROGRAM_EDIT],
        isProgramAdmin: true,
      });

      render(
        <Can permission={Permission.PROGRAM_EDIT}>
          <div>Editable Content</div>
        </Can>
      );

      expect(screen.getByText("Editable Content")).toBeInTheDocument();
    });

    it("should render fallback when user lacks permission", () => {
      setMockContext({
        roles: { primaryRole: Role.GUEST, roles: [Role.GUEST], reviewerTypes: [] },
        permissions: [Permission.COMMUNITY_VIEW],
      });

      render(
        <Can permission={Permission.PROGRAM_EDIT} fallback={<div>No Access</div>}>
          <div>Editable Content</div>
        </Can>
      );

      expect(screen.getByText("No Access")).toBeInTheDocument();
      expect(screen.queryByText("Editable Content")).not.toBeInTheDocument();
    });

    it("should render children when user has any of multiple permissions", () => {
      setMockContext({
        roles: { primaryRole: Role.PROGRAM_ADMIN, roles: [Role.PROGRAM_ADMIN], reviewerTypes: [] },
        permissions: [Permission.PROGRAM_VIEW],
        isProgramAdmin: true,
      });

      render(
        <Can permissions={[Permission.PROGRAM_EDIT, Permission.PROGRAM_VIEW]}>
          <div>Has Access</div>
        </Can>
      );

      expect(screen.getByText("Has Access")).toBeInTheDocument();
    });

    it("should require all permissions when requireAll is true", () => {
      setMockContext({
        roles: { primaryRole: Role.PROGRAM_ADMIN, roles: [Role.PROGRAM_ADMIN], reviewerTypes: [] },
        permissions: [Permission.PROGRAM_VIEW],
        isProgramAdmin: true,
      });

      render(
        <Can
          permissions={[Permission.PROGRAM_VIEW, Permission.PROGRAM_EDIT]}
          requireAll
          fallback={<div>Missing Permission</div>}
        >
          <div>Full Access</div>
        </Can>
      );

      expect(screen.getByText("Missing Permission")).toBeInTheDocument();
    });

    it("should check role when role prop is provided", () => {
      setMockContext({
        roles: {
          primaryRole: Role.COMMUNITY_ADMIN,
          roles: [Role.COMMUNITY_ADMIN],
          reviewerTypes: [],
        },
        permissions: [],
        isCommunityAdmin: true,
      });

      render(
        <Can role={Role.COMMUNITY_ADMIN}>
          <div>Admin Content</div>
        </Can>
      );

      expect(screen.getByText("Admin Content")).toBeInTheDocument();
    });

    it("should check role hierarchy when roleOrHigher is provided", () => {
      setMockContext({
        roles: { primaryRole: Role.SUPER_ADMIN, roles: [Role.SUPER_ADMIN], reviewerTypes: [] },
        permissions: [],
      });

      render(
        <Can roleOrHigher={Role.PROGRAM_ADMIN}>
          <div>Admin Content</div>
        </Can>
      );

      expect(screen.getByText("Admin Content")).toBeInTheDocument();
    });
  });

  describe("Cannot component", () => {
    it("should render children when user lacks permission", () => {
      setMockContext({
        roles: { primaryRole: Role.GUEST, roles: [Role.GUEST], reviewerTypes: [] },
        permissions: [Permission.COMMUNITY_VIEW],
      });

      render(
        <Cannot permission={Permission.PROGRAM_EDIT}>
          <div>Guest Content</div>
        </Cannot>
      );

      expect(screen.getByText("Guest Content")).toBeInTheDocument();
    });

    it("should not render children when user has permission", () => {
      setMockContext({
        roles: { primaryRole: Role.PROGRAM_ADMIN, roles: [Role.PROGRAM_ADMIN], reviewerTypes: [] },
        permissions: [Permission.PROGRAM_EDIT],
        isProgramAdmin: true,
      });

      render(
        <Cannot permission={Permission.PROGRAM_EDIT}>
          <div>Guest Content</div>
        </Cannot>
      );

      expect(screen.queryByText("Guest Content")).not.toBeInTheDocument();
    });
  });

  describe("RequirePermission component", () => {
    it("should render children when permission is present", () => {
      setMockContext({
        roles: { primaryRole: Role.PROGRAM_ADMIN, roles: [Role.PROGRAM_ADMIN], reviewerTypes: [] },
        permissions: [Permission.APPLICATION_APPROVE],
        isProgramAdmin: true,
      });

      render(
        <RequirePermission permission={Permission.APPLICATION_APPROVE}>
          <div>Approve Button</div>
        </RequirePermission>
      );

      expect(screen.getByText("Approve Button")).toBeInTheDocument();
    });
  });

  describe("RequireRole component", () => {
    it("should render children when user has exact role", () => {
      setMockContext({
        roles: { primaryRole: Role.PROGRAM_ADMIN, roles: [Role.PROGRAM_ADMIN], reviewerTypes: [] },
        permissions: [],
        isProgramAdmin: true,
      });

      render(
        <RequireRole role={Role.PROGRAM_ADMIN}>
          <div>Admin Panel</div>
        </RequireRole>
      );

      expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    });

    it("should check role hierarchy when orHigher is true", () => {
      setMockContext({
        roles: { primaryRole: Role.SUPER_ADMIN, roles: [Role.SUPER_ADMIN], reviewerTypes: [] },
        permissions: [],
      });

      render(
        <RequireRole role={Role.PROGRAM_ADMIN} orHigher>
          <div>Admin Panel</div>
        </RequireRole>
      );

      expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    });
  });

  describe("Permission boundary tests", () => {
    it("should deny admin-only content to a GUEST user", () => {
      setMockContext({
        roles: { primaryRole: Role.GUEST, roles: [Role.GUEST], reviewerTypes: [] },
        permissions: [Permission.PROGRAM_VIEW],
      });

      render(
        <Can permission={Permission.COMMUNITY_EDIT} fallback={<div>Denied</div>}>
          <div>Admin Content</div>
        </Can>
      );

      expect(screen.getByText("Denied")).toBeInTheDocument();
      expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
    });

    it("should allow a PROGRAM_REVIEWER to see review content", () => {
      setMockContext({
        roles: {
          primaryRole: Role.PROGRAM_REVIEWER,
          roles: [Role.PROGRAM_REVIEWER],
          reviewerTypes: [ReviewerType.PROGRAM],
        },
        permissions: [
          Permission.PROGRAM_VIEW,
          Permission.APPLICATION_VIEW_ASSIGNED,
          Permission.APPLICATION_REVIEW,
          Permission.APPLICATION_CHANGE_STATUS,
          Permission.REVIEW_CREATE,
          Permission.REVIEW_EDIT_OWN,
        ],
        isReviewer: true,
      });

      render(
        <Can permission={Permission.APPLICATION_REVIEW}>
          <div>Review Panel</div>
        </Can>
      );

      expect(screen.getByText("Review Panel")).toBeInTheDocument();
    });

    it("should deny admin content to a PROGRAM_REVIEWER", () => {
      setMockContext({
        roles: {
          primaryRole: Role.PROGRAM_REVIEWER,
          roles: [Role.PROGRAM_REVIEWER],
          reviewerTypes: [ReviewerType.PROGRAM],
        },
        permissions: [
          Permission.PROGRAM_VIEW,
          Permission.APPLICATION_VIEW_ASSIGNED,
          Permission.APPLICATION_REVIEW,
          Permission.APPLICATION_CHANGE_STATUS,
          Permission.REVIEW_CREATE,
          Permission.REVIEW_EDIT_OWN,
        ],
        isReviewer: true,
      });

      render(
        <Can permission={Permission.COMMUNITY_EDIT} fallback={<div>No Admin Access</div>}>
          <div>Admin Panel</div>
        </Can>
      );

      expect(screen.getByText("No Admin Access")).toBeInTheDocument();
      expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
    });

    it("should allow a COMMUNITY_ADMIN to see community-level content", () => {
      setMockContext({
        roles: {
          primaryRole: Role.COMMUNITY_ADMIN,
          roles: [Role.COMMUNITY_ADMIN],
          reviewerTypes: [],
        },
        permissions: [
          Permission.COMMUNITY_VIEW,
          Permission.COMMUNITY_EDIT,
          Permission.COMMUNITY_MANAGE_MEMBERS,
          Permission.COMMUNITY_MANAGE_PROGRAMS,
          Permission.PROGRAM_VIEW,
          Permission.PROGRAM_EDIT,
          Permission.APPLICATION_VIEW_ALL,
        ],
        isCommunityAdmin: true,
      });

      render(
        <Can permission={Permission.COMMUNITY_MANAGE_MEMBERS}>
          <div>Community Management</div>
        </Can>
      );

      expect(screen.getByText("Community Management")).toBeInTheDocument();
    });
  });

  describe("AdminOnly component", () => {
    it("should render for program admin by default", () => {
      setMockContext({
        roles: { primaryRole: Role.PROGRAM_ADMIN, roles: [Role.PROGRAM_ADMIN], reviewerTypes: [] },
        permissions: [],
        isProgramAdmin: true,
      });

      render(
        <AdminOnly>
          <div>Admin Section</div>
        </AdminOnly>
      );

      expect(screen.getByText("Admin Section")).toBeInTheDocument();
    });

    it("should render for community admin when level is community", () => {
      setMockContext({
        roles: {
          primaryRole: Role.COMMUNITY_ADMIN,
          roles: [Role.COMMUNITY_ADMIN],
          reviewerTypes: [],
        },
        permissions: [],
        isCommunityAdmin: true,
      });

      render(
        <AdminOnly level="community">
          <div>Community Admin Section</div>
        </AdminOnly>
      );

      expect(screen.getByText("Community Admin Section")).toBeInTheDocument();
    });

    it("should render for super admin when level is super", () => {
      setMockContext({
        roles: { primaryRole: Role.SUPER_ADMIN, roles: [Role.SUPER_ADMIN], reviewerTypes: [] },
        permissions: [],
      });

      render(
        <AdminOnly level="super">
          <div>Super Admin Section</div>
        </AdminOnly>
      );

      expect(screen.getByText("Super Admin Section")).toBeInTheDocument();
    });

    it("should not render for lower roles", () => {
      setMockContext({
        roles: { primaryRole: Role.APPLICANT, roles: [Role.APPLICANT], reviewerTypes: [] },
        permissions: [],
      });

      render(
        <AdminOnly fallback={<div>Not Authorized</div>}>
          <div>Admin Section</div>
        </AdminOnly>
      );

      expect(screen.getByText("Not Authorized")).toBeInTheDocument();
      expect(screen.queryByText("Admin Section")).not.toBeInTheDocument();
    });
  });
});
