import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { RoleManagementTab } from "@/components/Generic/RoleManagement/RoleManagementTab";
import type { RoleManagementConfig, RoleOption } from "@/components/Generic/RoleManagement/types";

const mockCopy = jest.fn().mockResolvedValue(true);
jest.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: () => [null, mockCopy],
}));

const mockDeleteDialog = jest.fn();
jest.mock("@/components/DeleteDialog", () => ({
  DeleteDialog: (props: Record<string, unknown>) => {
    mockDeleteDialog(props);
    return props.externalIsOpen ? (
      <div data-testid="delete-dialog">
        <button
          data-testid="delete-dialog-confirm"
          onClick={() => (props.deleteFunction as () => Promise<void>)()}
        >
          Confirm
        </button>
        <button
          data-testid="delete-dialog-cancel"
          onClick={() => (props.externalSetIsOpen as (v: boolean) => void)(false)}
        >
          Cancel
        </button>
      </div>
    ) : null;
  },
}));

jest.mock("@/components/Utilities/Spinner", () => ({
  Spinner: ({ className }: { className?: string }) => (
    <div data-testid="spinner" className={className} />
  ),
}));

jest.mock("@/components/Utilities/Button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    className,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    className?: string;
    "aria-label"?: string;
    "aria-expanded"?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      className={className}
      {...rest}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/Icons", () => ({
  TelegramIcon: ({ className }: { className?: string }) => (
    <span data-testid="telegram-icon" className={className} />
  ),
}));

jest.mock("@/utilities/formatDate", () => ({
  formatDate: (date: string) => `formatted-${date}`,
}));

jest.mock("@/utilities/tailwind", () => ({
  cn: (...args: (string | boolean | undefined)[]) => args.filter(Boolean).join(" "),
}));

const defaultConfig: RoleManagementConfig = {
  roleName: "test-role",
  roleDisplayName: "Test Role",
  fields: [
    { name: "email", label: "Email", type: "email", required: true },
    { name: "name", label: "Name", type: "text", required: true },
  ],
  resource: "test-resource",
};

const roleOptions: RoleOption[] = [
  { value: "program", label: "App Reviewer", config: defaultConfig },
  { value: "milestone", label: "Milestone Reviewer", config: defaultConfig },
];

describe("RoleManagementTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("loading state", () => {
    it("renders spinner when loading", () => {
      render(<RoleManagementTab config={defaultConfig} members={[]} isLoading />);
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty state message when no members", () => {
      render(<RoleManagementTab config={defaultConfig} members={[]} />);
      expect(screen.getByText("No test roles")).toBeInTheDocument();
    });

    it("shows reviewer-specific empty state with role options", () => {
      render(
        <RoleManagementTab
          config={defaultConfig}
          members={[]}
          roleOptions={roleOptions}
          selectedRoles={["program"]}
          onRolesChange={jest.fn()}
        />
      );
      expect(screen.getByText("No reviewers")).toBeInTheDocument();
    });
  });

  describe("member list with multiple roles", () => {
    it("displays multiple role badges for members with multiple roles", () => {
      const members = [
        {
          id: "alice@example.com",
          name: "Alice",
          email: "alice@example.com",
          roles: ["program" as const, "milestone" as const],
        },
      ];

      render(
        <RoleManagementTab
          config={defaultConfig}
          members={members}
          roleOptions={roleOptions}
          selectedRoles={["program"]}
          onRolesChange={jest.fn()}
        />
      );

      expect(screen.getByText("App")).toBeInTheDocument();
      expect(screen.getByText("Milestone")).toBeInTheDocument();
    });

    it("displays single role badge for single-role members", () => {
      const members = [
        {
          id: "bob@example.com",
          name: "Bob",
          email: "bob@example.com",
          roles: ["program" as const],
        },
      ];

      render(
        <RoleManagementTab
          config={defaultConfig}
          members={members}
          roleOptions={roleOptions}
          selectedRoles={["program"]}
          onRolesChange={jest.fn()}
        />
      );

      expect(screen.getByText("App")).toBeInTheDocument();
      expect(screen.queryByText("Milestone")).not.toBeInTheDocument();
    });
  });

  describe("add form with checkboxes", () => {
    it("renders checkboxes instead of radio buttons when selectedRoles is provided", async () => {
      const user = userEvent.setup();

      render(
        <RoleManagementTab
          config={defaultConfig}
          members={[]}
          canManage
          onAdd={jest.fn()}
          roleOptions={roleOptions}
          selectedRoles={["program"]}
          onRolesChange={jest.fn()}
        />
      );

      // Open the add form
      await user.click(screen.getByLabelText("Add new reviewer"));

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(2);
      expect(screen.getByText("App Reviewer")).toBeInTheDocument();
      expect(screen.getByText("Milestone Reviewer")).toBeInTheDocument();
    });

    it("calls onRolesChange when toggling a role checkbox", async () => {
      const onRolesChange = jest.fn();
      const user = userEvent.setup();

      render(
        <RoleManagementTab
          config={defaultConfig}
          members={[]}
          canManage
          onAdd={jest.fn()}
          roleOptions={roleOptions}
          selectedRoles={["program"]}
          onRolesChange={onRolesChange}
        />
      );

      await user.click(screen.getByLabelText("Add new reviewer"));

      // Check the milestone checkbox (program is already checked)
      const milestoneCheckbox = screen.getByRole("checkbox", {
        checked: false,
      });
      await user.click(milestoneCheckbox);

      expect(onRolesChange).toHaveBeenCalledWith(["program", "milestone"]);
    });
  });

  describe("edit functionality", () => {
    it("renders edit button when onEditRoles is provided", () => {
      const members = [
        {
          id: "alice@example.com",
          name: "Alice",
          email: "alice@example.com",
          roles: ["program" as const],
        },
      ];

      render(
        <RoleManagementTab
          config={defaultConfig}
          members={members}
          canManage
          roleOptions={roleOptions}
          selectedRoles={["program"]}
          onRolesChange={jest.fn()}
          onEditRoles={jest.fn()}
        />
      );

      expect(screen.getByLabelText("Edit roles for Alice")).toBeInTheDocument();
    });

    it("does not render edit button when onEditRoles is not provided", () => {
      const members = [
        {
          id: "alice@example.com",
          name: "Alice",
          email: "alice@example.com",
          roles: ["program" as const],
        },
      ];

      render(
        <RoleManagementTab
          config={defaultConfig}
          members={members}
          canManage
          roleOptions={roleOptions}
          selectedRoles={["program"]}
          onRolesChange={jest.fn()}
        />
      );

      expect(screen.queryByLabelText("Edit roles for Alice")).not.toBeInTheDocument();
    });

    it("shows inline edit form when edit button is clicked", async () => {
      const user = userEvent.setup();
      const members = [
        {
          id: "alice@example.com",
          name: "Alice",
          email: "alice@example.com",
          roles: ["program" as const],
        },
      ];

      render(
        <RoleManagementTab
          config={defaultConfig}
          members={members}
          canManage
          roleOptions={roleOptions}
          selectedRoles={["program"]}
          onRolesChange={jest.fn()}
          onEditRoles={jest.fn()}
        />
      );

      await user.click(screen.getByLabelText("Edit roles for Alice"));

      // Edit form shows checkboxes for roles
      expect(screen.getByLabelText("Save role changes")).toBeInTheDocument();
      expect(screen.getByLabelText("Cancel editing")).toBeInTheDocument();
    });

    it("calls onEditRoles with new roles when save is clicked", async () => {
      const user = userEvent.setup();
      const onEditRoles = jest.fn().mockResolvedValue(undefined);
      const members = [
        {
          id: "alice@example.com",
          name: "Alice",
          email: "alice@example.com",
          roles: ["program" as const],
        },
      ];

      render(
        <RoleManagementTab
          config={defaultConfig}
          members={members}
          canManage
          roleOptions={roleOptions}
          selectedRoles={["program"]}
          onRolesChange={jest.fn()}
          onEditRoles={onEditRoles}
          onRefresh={jest.fn()}
        />
      );

      await user.click(screen.getByLabelText("Edit roles for Alice"));

      // The program checkbox should be checked, milestone unchecked
      // Check the milestone checkbox
      const uncheckedCheckbox = screen.getByRole("checkbox", { checked: false });
      await user.click(uncheckedCheckbox);

      await user.click(screen.getByLabelText("Save role changes"));

      expect(onEditRoles).toHaveBeenCalledWith("alice@example.com", ["program", "milestone"]);
    });

    it("cancels edit when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const members = [
        {
          id: "alice@example.com",
          name: "Alice",
          email: "alice@example.com",
          roles: ["program" as const],
        },
      ];

      render(
        <RoleManagementTab
          config={defaultConfig}
          members={members}
          canManage
          roleOptions={roleOptions}
          selectedRoles={["program"]}
          onRolesChange={jest.fn()}
          onEditRoles={jest.fn()}
        />
      );

      await user.click(screen.getByLabelText("Edit roles for Alice"));
      expect(screen.getByLabelText("Save role changes")).toBeInTheDocument();

      await user.click(screen.getByLabelText("Cancel editing"));
      expect(screen.queryByLabelText("Save role changes")).not.toBeInTheDocument();
    });

    it("uses DeleteDialog instead of confirm() when removing with zero roles", async () => {
      const user = userEvent.setup();
      const onEditRoles = jest.fn().mockResolvedValue(undefined);
      const members = [
        {
          id: "alice@example.com",
          name: "Alice",
          email: "alice@example.com",
          roles: ["program" as const],
        },
      ];

      render(
        <RoleManagementTab
          config={defaultConfig}
          members={members}
          canManage
          roleOptions={roleOptions}
          selectedRoles={["program"]}
          onRolesChange={jest.fn()}
          onEditRoles={onEditRoles}
          onRefresh={jest.fn()}
        />
      );

      await user.click(screen.getByLabelText("Edit roles for Alice"));

      // Uncheck the only checked role
      const checkedCheckbox = screen.getByRole("checkbox", { checked: true });
      await user.click(checkedCheckbox);

      // Click save - should show DeleteDialog, not browser confirm()
      await user.click(screen.getByLabelText("Save role changes"));

      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
    });

    it("hides role badges and action buttons while editing", async () => {
      const user = userEvent.setup();
      const members = [
        {
          id: "alice@example.com",
          name: "Alice",
          email: "alice@example.com",
          roles: ["program" as const],
        },
      ];

      render(
        <RoleManagementTab
          config={defaultConfig}
          members={members}
          canManage
          roleOptions={roleOptions}
          selectedRoles={["program"]}
          onRolesChange={jest.fn()}
          onEditRoles={jest.fn()}
        />
      );

      await user.click(screen.getByLabelText("Edit roles for Alice"));

      // Role badges should be hidden during edit
      expect(screen.queryByText("App")).not.toBeInTheDocument();
      // Edit/remove buttons should be hidden during edit
      expect(screen.queryByLabelText("Edit roles for Alice")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Remove Alice")).not.toBeInTheDocument();
    });
  });

  describe("remove confirmation", () => {
    it("uses DeleteDialog instead of confirm() for removal", async () => {
      const user = userEvent.setup();
      const onRemove = jest.fn().mockResolvedValue(undefined);
      const members = [
        {
          id: "alice@example.com",
          name: "Alice",
          email: "alice@example.com",
          roles: ["program" as const],
        },
      ];

      render(
        <RoleManagementTab
          config={defaultConfig}
          members={members}
          canManage
          onRemove={onRemove}
          roleOptions={roleOptions}
          selectedRoles={["program"]}
          onRolesChange={jest.fn()}
        />
      );

      await user.click(screen.getByLabelText("Remove Alice"));

      // Should show DeleteDialog
      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();

      // Confirm the deletion
      await user.click(screen.getByTestId("delete-dialog-confirm"));

      expect(onRemove).toHaveBeenCalledWith("alice@example.com");
    });
  });

  describe("clipboard", () => {
    it("uses useCopyToClipboard hook instead of raw navigator.clipboard", async () => {
      const user = userEvent.setup();
      const members = [
        {
          id: "alice@example.com",
          name: "Alice",
          email: "alice@example.com",
          publicAddress: "0x1234567890abcdef1234567890abcdef12345678",
          roles: ["program" as const],
        },
      ];

      render(
        <RoleManagementTab
          config={defaultConfig}
          members={members}
          roleOptions={roleOptions}
          selectedRoles={["program"]}
          onRolesChange={jest.fn()}
        />
      );

      const copyButton = screen.getByTitle("Click to copy wallet address");
      await user.click(copyButton);

      expect(mockCopy).toHaveBeenCalledWith(
        "0x1234567890abcdef1234567890abcdef12345678",
        "Address copied to clipboard"
      );
    });
  });
});
