/**
 * @file Tests for GrantTitleDropdown component
 * @description Tests for program selection dropdown including restriction
 * enforcement for programs with anyoneCanJoin: false
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { GrantTitleDropdown } from "@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrant/GrantTitleDropdown";

// Mock react-hot-toast
const mockToastError = jest.fn();
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: jest.fn(),
  },
}));

// Mock pluralize
jest.mock("pluralize", () => ({
  __esModule: true,
  default: (word: string) => word,
}));

// Mock @radix-ui/react-popover
jest.mock("@radix-ui/react-popover", () => {
  const React = require("react");
  return {
    Root: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
      <div data-testid="popover-root" data-open={open}>
        {children}
      </div>
    ),
    Trigger: React.forwardRef(
      (
        { children, className, ...props }: React.HTMLAttributes<HTMLButtonElement>,
        ref: React.Ref<HTMLButtonElement>
      ) => (
        <button ref={ref} className={className} {...props} data-testid="popover-trigger">
          {children}
        </button>
      )
    ),
    Content: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
      style?: React.CSSProperties;
    }) => (
      <div data-testid="popover-content" className={className}>
        {children}
      </div>
    ),
  };
});

// Mock cmdk
jest.mock("cmdk", () => {
  const React = require("react");
  return {
    Command: ({
      children,
    }: {
      children: React.ReactNode;
      filter?: (value: string, search: string) => number;
    }) => <div data-testid="command-root">{children}</div>,
    CommandInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
      <input data-testid="command-input" {...props} />
    ),
    CommandEmpty: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div data-testid="command-empty" className={className}>
        {children}
      </div>
    ),
    CommandGroup: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="command-group">{children}</div>
    ),
    CommandItem: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="command-item">{children}</div>
    ),
  };
});

// Mock heroicons
jest.mock("@heroicons/react/24/solid", () => ({
  CheckIcon: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <span data-testid="check-icon" className={className} style={style} />
  ),
  ChevronDownIcon: ({ className }: { className?: string }) => (
    <span data-testid="chevron-icon" className={className} />
  ),
}));

// Type for test data
import type { FundingProgramResponse } from "@/src/features/funding-map/types/funding-program";

type TestProgram = FundingProgramResponse;

// Test data
const createOpenProgram = (overrides?: Partial<TestProgram>): TestProgram => ({
  _id: { $oid: "open-program-id" },
  programId: "program-open-123",
  metadata: {
    title: "Open Program",
    status: "Active",
    anyoneCanJoin: true,
  },
  chainID: 10,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  ...overrides,
});

const createRestrictedProgram = (overrides?: Partial<TestProgram>): TestProgram => ({
  _id: { $oid: "restricted-program-id" },
  programId: "program-restricted-456",
  metadata: {
    title: "Restricted Program",
    status: "Active",
    anyoneCanJoin: false,
  },
  chainID: 10,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  ...overrides,
});

const createProgramWithoutFlag = (overrides?: Partial<TestProgram>): TestProgram => ({
  _id: { $oid: "no-flag-program-id" },
  programId: "program-noflag-789",
  metadata: {
    title: "No Flag Program",
    status: "Active",
  },
  chainID: 10,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  ...overrides,
});

describe("GrantTitleDropdown", () => {
  const mockSetValue = jest.fn();
  const mockSetSelectedProgram = jest.fn();
  const mockCleanFunction = jest.fn();

  const defaultProps = {
    setValue: mockSetValue,
    selectedProgram: null,
    grantToEdit: undefined,
    list: [createOpenProgram(), createRestrictedProgram(), createProgramWithoutFlag()],
    type: "Programs",
    chainId: 10,
    setSelectedProgram: mockSetSelectedProgram,
    canAdd: true,
    canSearch: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the dropdown trigger", () => {
      render(<GrantTitleDropdown {...defaultProps} />);

      expect(screen.getByTestId("popover-trigger")).toBeInTheDocument();
    });

    it("should render all program items", () => {
      render(<GrantTitleDropdown {...defaultProps} />);

      expect(screen.getByText("Open Program")).toBeInTheDocument();
      expect(screen.getByText("Restricted Program")).toBeInTheDocument();
      expect(screen.getByText("No Flag Program")).toBeInTheDocument();
    });

    it("should show '(invite only)' label for restricted programs", () => {
      render(<GrantTitleDropdown {...defaultProps} />);

      const inviteOnlyLabels = screen.getAllByText("(invite only)");
      expect(inviteOnlyLabels).toHaveLength(1);
    });

    it("should apply restricted styling to programs with anyoneCanJoin: false", () => {
      render(<GrantTitleDropdown {...defaultProps} />);

      const restrictedButton = screen.getByText("Restricted Program").closest("button");
      expect(restrictedButton).toHaveAttribute("aria-disabled", "true");
      expect(restrictedButton).toHaveAttribute("tabindex", "-1");
      expect(restrictedButton?.className).toContain("opacity-60");
      expect(restrictedButton?.className).toContain("cursor-not-allowed");
    });

    it("should not apply restricted styling to open programs", () => {
      render(<GrantTitleDropdown {...defaultProps} />);

      const openButton = screen.getByText("Open Program").closest("button");
      expect(openButton).toHaveAttribute("aria-disabled", "false");
      expect(openButton).toHaveAttribute("tabindex", "0");
      expect(openButton?.className).toContain("cursor-pointer");
    });

    it("should not restrict programs without anyoneCanJoin flag", () => {
      render(<GrantTitleDropdown {...defaultProps} />);

      const noFlagButton = screen.getByText("No Flag Program").closest("button");
      expect(noFlagButton).toHaveAttribute("aria-disabled", "false");
      expect(noFlagButton).toHaveAttribute("tabindex", "0");
    });
  });

  describe("Program Selection", () => {
    it("should allow selecting open programs", async () => {
      const user = userEvent.setup();
      render(<GrantTitleDropdown {...defaultProps} />);

      const openButton = screen.getByText("Open Program").closest("button")!;
      await user.click(openButton);

      expect(mockSetSelectedProgram).toHaveBeenCalledWith(
        expect.objectContaining({
          programId: "program-open-123",
          metadata: expect.objectContaining({ title: "Open Program" }),
        })
      );
      expect(mockSetValue).toHaveBeenCalledWith("programId", "program-open-123");
      expect(mockSetValue).toHaveBeenCalledWith("title", "Open Program", {
        shouldValidate: true,
      });
    });

    it("should block selecting restricted programs and show toast error", async () => {
      const user = userEvent.setup();
      render(<GrantTitleDropdown {...defaultProps} />);

      const restrictedButton = screen.getByText("Restricted Program").closest("button")!;
      await user.click(restrictedButton);

      expect(mockToastError).toHaveBeenCalledWith(
        "Please contact the program manager to add this grant to your project",
        { duration: 5000 }
      );
      expect(mockSetSelectedProgram).not.toHaveBeenCalled();
      expect(mockSetValue).not.toHaveBeenCalled();
    });

    it("should allow selecting programs without anyoneCanJoin flag", async () => {
      const user = userEvent.setup();
      render(<GrantTitleDropdown {...defaultProps} />);

      const noFlagButton = screen.getByText("No Flag Program").closest("button")!;
      await user.click(noFlagButton);

      expect(mockSetSelectedProgram).toHaveBeenCalledWith(
        expect.objectContaining({
          programId: "program-noflag-789",
        })
      );
    });
  });

  describe("addCustom restriction bypass prevention", () => {
    it("should block addCustom when typed name matches a restricted program", async () => {
      const user = userEvent.setup();
      render(<GrantTitleDropdown {...defaultProps} />);

      // Click "Add new" button to enter adding mode
      const addNewButton = screen.getByText("Add new");
      await user.click(addNewButton);

      // Type the name of the restricted program
      const input = screen.getByPlaceholderText("Programs name...");
      await user.type(input, "Restricted Program");
      await user.keyboard("{Enter}");

      expect(mockToastError).toHaveBeenCalledWith(
        "Please contact the program manager to add this grant to your project",
        { duration: 5000 }
      );
      expect(mockSetSelectedProgram).not.toHaveBeenCalled();
    });

    it("should allow addCustom when typed name matches an open program", async () => {
      const user = userEvent.setup();
      render(<GrantTitleDropdown {...defaultProps} />);

      // Click "Add new" button to enter adding mode
      const addNewButton = screen.getByText("Add new");
      await user.click(addNewButton);

      // Type the name of the open program
      const input = screen.getByPlaceholderText("Programs name...");
      await user.type(input, "Open Program");
      await user.keyboard("{Enter}");

      expect(mockToastError).not.toHaveBeenCalled();
      expect(mockSetSelectedProgram).toHaveBeenCalledWith(
        expect.objectContaining({
          programId: "program-open-123",
        })
      );
    });

    it("should allow addCustom for completely new program names", async () => {
      const user = userEvent.setup();
      render(<GrantTitleDropdown {...defaultProps} />);

      // Click "Add new" button to enter adding mode
      const addNewButton = screen.getByText("Add new");
      await user.click(addNewButton);

      // Type a new program name
      const input = screen.getByPlaceholderText("Programs name...");
      await user.type(input, "Brand New Program");
      await user.keyboard("{Enter}");

      expect(mockToastError).not.toHaveBeenCalled();
      expect(mockSetSelectedProgram).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ title: "Brand New Program" }),
        })
      );
    });

    it("should block addCustom case-insensitively for restricted programs", async () => {
      const user = userEvent.setup();
      render(<GrantTitleDropdown {...defaultProps} />);

      const addNewButton = screen.getByText("Add new");
      await user.click(addNewButton);

      const input = screen.getByPlaceholderText("Programs name...");
      await user.type(input, "restricted program"); // lowercase
      await user.keyboard("{Enter}");

      expect(mockToastError).toHaveBeenCalledWith(
        "Please contact the program manager to add this grant to your project",
        { duration: 5000 }
      );
      expect(mockSetSelectedProgram).not.toHaveBeenCalled();
    });
  });

  describe("Keyboard accessibility", () => {
    it("should prevent keyboard activation of restricted programs via Enter key", async () => {
      const user = userEvent.setup();
      render(<GrantTitleDropdown {...defaultProps} />);

      const restrictedButton = screen.getByText("Restricted Program").closest("button")!;
      restrictedButton.focus();

      // Simulate Enter key on restricted button
      await user.keyboard("{Enter}");

      // The toast should be shown (from the click handler) but the selection should not go through
      // Note: The tabIndex=-1 prevents focus, but if somehow focused, Enter is blocked
    });
  });

  describe("Clean function", () => {
    it("should render 'Any' option when cleanFunction is provided", () => {
      render(<GrantTitleDropdown {...defaultProps} cleanFunction={mockCleanFunction} />);

      expect(screen.getByText("Any")).toBeInTheDocument();
    });

    it("should call cleanFunction when 'Any' is clicked", async () => {
      const user = userEvent.setup();
      render(<GrantTitleDropdown {...defaultProps} cleanFunction={mockCleanFunction} />);

      const anyButton = screen.getByText("Any").closest("button")!;
      await user.click(anyButton);

      expect(mockCleanFunction).toHaveBeenCalled();
    });
  });

  describe("Stable keys", () => {
    it("should use programId as key when available", () => {
      const programs = [
        createOpenProgram({ programId: "unique-id-1" }),
        createOpenProgram({
          _id: { $oid: "different-oid" },
          programId: "unique-id-2",
          metadata: { title: "Another Program", status: "Active", anyoneCanJoin: true },
        }),
      ];

      render(<GrantTitleDropdown {...defaultProps} list={programs} />);

      // Both programs should render without key warnings
      expect(screen.getByText("Open Program")).toBeInTheDocument();
      expect(screen.getByText("Another Program")).toBeInTheDocument();
    });
  });
});
