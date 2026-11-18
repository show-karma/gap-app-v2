import { render, screen } from "@testing-library/react";
import { TableStatusActionButtons } from "@/components/FundingPlatform/ApplicationList/TableStatusActionButtons";
import HeaderActions from "@/components/FundingPlatform/ApplicationView/HeaderActions";
import { StatusActionButtons } from "@/components/FundingPlatform/ApplicationView/StatusActionButtons";
import { getPermissionsForRoles } from "@/src/core/rbac/policies/permission-matrix";
import { type Permission, Role } from "@/src/core/rbac/types";

let grantedPermissions: Permission[] = [];

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: () => ({
    isLoading: false,
    can: (permission: Permission) => grantedPermissions.includes(permission),
    canAny: (permissions: Permission[]) => permissions.some((p) => grantedPermissions.includes(p)),
    canAll: (permissions: Permission[]) => permissions.every((p) => grantedPermissions.includes(p)),
    hasRole: () => false,
    hasRoleOrHigher: () => false,
    isReviewerType: () => false,
  }),
}));

const noop = vi.fn();

describe("application decision actions for a program reviewer", () => {
  beforeEach(() => {
    grantedPermissions = getPermissionsForRoles([Role.PROGRAM_REVIEWER]);
  });

  it("offers Approve and Reject on an under_review application in the detail view", () => {
    render(<StatusActionButtons currentStatus="under_review" onStatusChange={noop} />);

    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request Revision" })).toBeInTheDocument();
  });

  it("offers Approve and Reject on an under_review application in the header", () => {
    render(<HeaderActions currentStatus="under_review" onStatusChange={noop} />);

    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("offers Approve and Reject on an under_review row in the applications table", () => {
    render(
      <TableStatusActionButtons
        applicationId="APP-1"
        currentStatus="under_review"
        onStatusChange={noop}
      />
    );

    expect(screen.getByRole("button", { name: /Approve/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reject/ })).toBeInTheDocument();
  });

  it("does not offer Approve or Reject before the review has started", () => {
    render(<StatusActionButtons currentStatus="pending" onStatusChange={noop} />);

    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });

  it("hides every decision action from a user without status-change permission", () => {
    grantedPermissions = getPermissionsForRoles([Role.APPLICANT]);

    render(<StatusActionButtons currentStatus="under_review" onStatusChange={noop} />);

    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });
});
