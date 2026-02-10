import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { GrantTitleDropdown } from "../GrantTitleDropdown";

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe("GrantTitleDropdown", () => {
  const mockSetValue = jest.fn();
  const mockSetSelectedProgram = jest.fn();

  const createMockProgram = (overrides: Partial<GrantProgram> = {}): GrantProgram => ({
    _id: { $oid: "test-id" },
    programId: "program-1",
    chainID: 10,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    ...overrides,
    metadata: {
      title: "Test Program",
      description: "Test description",
      status: "Active",
      ...overrides.metadata,
    },
  });

  const defaultProps = {
    setValue: mockSetValue,
    selectedProgram: null,
    grantToEdit: undefined,
    list: [],
    type: "Program",
    chainId: 10,
    setSelectedProgram: mockSetSelectedProgram,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("restricted program handling", () => {
    it("should show '(invite only)' badge for programs with anyoneCanJoin: false", async () => {
      const restrictedProgram = createMockProgram({
        programId: "restricted-1",
        metadata: {
          title: "Restricted Program",
          description: "A restricted program",
          status: "Active",
          anyoneCanJoin: false,
        },
      });

      render(<GrantTitleDropdown {...defaultProps} list={[restrictedProgram]} />);

      // Open the dropdown
      const trigger = screen.getByRole("button");
      fireEvent.click(trigger);

      // Wait for dropdown content to appear
      await waitFor(() => {
        expect(screen.getByText("Restricted Program")).toBeInTheDocument();
      });

      // Should show "(invite only)" badge
      expect(screen.getByText("(invite only)")).toBeInTheDocument();
    });

    it("should NOT show '(invite only)' badge for programs with anyoneCanJoin: true", async () => {
      const openProgram = createMockProgram({
        programId: "open-1",
        metadata: {
          title: "Open Program",
          description: "An open program",
          status: "Active",
          anyoneCanJoin: true,
        },
      });

      render(<GrantTitleDropdown {...defaultProps} list={[openProgram]} />);

      // Open the dropdown
      const trigger = screen.getByRole("button");
      fireEvent.click(trigger);

      // Wait for dropdown content to appear
      await waitFor(() => {
        expect(screen.getByText("Open Program")).toBeInTheDocument();
      });

      // Should NOT show "(invite only)" badge
      expect(screen.queryByText("(invite only)")).not.toBeInTheDocument();
    });

    it("should NOT show '(invite only)' badge for programs with anyoneCanJoin: undefined (backwards compatibility)", async () => {
      const legacyProgram = createMockProgram({
        programId: "legacy-1",
        metadata: {
          title: "Legacy Program",
          description: "A legacy program without anyoneCanJoin field",
          status: "Active",
          // anyoneCanJoin is undefined
        },
      });

      render(<GrantTitleDropdown {...defaultProps} list={[legacyProgram]} />);

      // Open the dropdown
      const trigger = screen.getByRole("button");
      fireEvent.click(trigger);

      // Wait for dropdown content to appear
      await waitFor(() => {
        expect(screen.getByText("Legacy Program")).toBeInTheDocument();
      });

      // Should NOT show "(invite only)" badge (undefined treated as open)
      expect(screen.queryByText("(invite only)")).not.toBeInTheDocument();
    });

    it("should show toast and prevent selection when clicking restricted program", async () => {
      const user = userEvent.setup();
      const restrictedProgram = createMockProgram({
        programId: "restricted-1",
        metadata: {
          title: "Restricted Program",
          description: "A restricted program",
          status: "Active",
          anyoneCanJoin: false,
        },
      });

      render(<GrantTitleDropdown {...defaultProps} list={[restrictedProgram]} />);

      // Open the dropdown
      const trigger = screen.getByRole("button");
      await user.click(trigger);

      // Wait for dropdown content to appear
      await waitFor(() => {
        expect(screen.getByText("Restricted Program")).toBeInTheDocument();
      });

      // Click the restricted program option
      const programButton = screen.getByText("Restricted Program");
      await user.click(programButton);

      // Should show error toast
      expect(toast.error).toHaveBeenCalledWith(
        "Please contact the program manager to add this grant to your project",
        { duration: 5000 }
      );

      // Should NOT call setSelectedProgram
      expect(mockSetSelectedProgram).not.toHaveBeenCalled();

      // Should NOT call setValue
      expect(mockSetValue).not.toHaveBeenCalled();
    });

    it("should select program when clicking open program", async () => {
      const user = userEvent.setup();
      const openProgram = createMockProgram({
        programId: "open-1",
        metadata: {
          title: "Open Program",
          description: "An open program",
          status: "Active",
          anyoneCanJoin: true,
        },
      });

      render(<GrantTitleDropdown {...defaultProps} list={[openProgram]} />);

      // Open the dropdown
      const trigger = screen.getByRole("button");
      await user.click(trigger);

      // Wait for dropdown content to appear
      await waitFor(() => {
        expect(screen.getByText("Open Program")).toBeInTheDocument();
      });

      // Click the open program option
      const programButton = screen.getByText("Open Program");
      await user.click(programButton);

      // Should NOT show error toast
      expect(toast.error).not.toHaveBeenCalled();

      // Should call setSelectedProgram
      expect(mockSetSelectedProgram).toHaveBeenCalledWith(openProgram);

      // Should call setValue with programId and title
      expect(mockSetValue).toHaveBeenCalledWith("programId", "open-1");
      expect(mockSetValue).toHaveBeenCalledWith("title", "Open Program", {
        shouldValidate: true,
      });
    });

    it("should display mixed list with both open and restricted programs correctly", async () => {
      const openProgram = createMockProgram({
        programId: "open-1",
        metadata: {
          title: "Open Program",
          description: "An open program",
          status: "Active",
          anyoneCanJoin: true,
        },
      });

      const restrictedProgram = createMockProgram({
        programId: "restricted-1",
        metadata: {
          title: "Restricted Program",
          description: "A restricted program",
          status: "Active",
          anyoneCanJoin: false,
        },
      });

      const legacyProgram = createMockProgram({
        programId: "legacy-1",
        metadata: {
          title: "Legacy Program",
          description: "A legacy program",
          status: "Active",
          // anyoneCanJoin is undefined - treated as open
        },
      });

      render(
        <GrantTitleDropdown
          {...defaultProps}
          list={[openProgram, restrictedProgram, legacyProgram]}
        />
      );

      // Open the dropdown
      const trigger = screen.getByRole("button");
      fireEvent.click(trigger);

      // Wait for dropdown content to appear
      await waitFor(() => {
        expect(screen.getByText("Open Program")).toBeInTheDocument();
        expect(screen.getByText("Restricted Program")).toBeInTheDocument();
        expect(screen.getByText("Legacy Program")).toBeInTheDocument();
      });

      // Should show only ONE "(invite only)" badge (for restricted program only)
      const inviteOnlyBadges = screen.getAllByText("(invite only)");
      expect(inviteOnlyBadges).toHaveLength(1);
    });
  });

  describe("addCustom restriction bypass prevention", () => {
    it("should block addCustom when typed name matches a restricted program", async () => {
      const user = userEvent.setup();
      const restrictedProgram = createMockProgram({
        programId: "restricted-1",
        metadata: {
          title: "Restricted Program",
          description: "A restricted program",
          status: "Active",
          anyoneCanJoin: false,
        },
      });

      render(
        <GrantTitleDropdown {...defaultProps} list={[restrictedProgram]} canAdd />
      );

      // Open the dropdown
      const trigger = screen.getByRole("button");
      await user.click(trigger);

      // Wait for dropdown content to appear
      await waitFor(() => {
        expect(screen.getByText("Restricted Program")).toBeInTheDocument();
      });

      // Click "Add new" button to enter adding mode
      const addNewButton = screen.getByText("Add new");
      await user.click(addNewButton);

      // Type the name of the restricted program and submit
      const input = screen.getByPlaceholderText("Program name...");
      await user.type(input, "Restricted Program");
      await user.keyboard("{Enter}");

      // Should show error toast
      expect(toast.error).toHaveBeenCalledWith(
        "Please contact the program manager to add this grant to your project",
        { duration: 5000 }
      );

      // Should NOT call setSelectedProgram
      expect(mockSetSelectedProgram).not.toHaveBeenCalled();

      // Should NOT call setValue
      expect(mockSetValue).not.toHaveBeenCalled();
    });

    it("should allow addCustom when typed name matches an open program", async () => {
      const user = userEvent.setup();
      const openProgram = createMockProgram({
        programId: "open-1",
        metadata: {
          title: "Open Program",
          description: "An open program",
          status: "Active",
          anyoneCanJoin: true,
        },
      });

      render(
        <GrantTitleDropdown {...defaultProps} list={[openProgram]} canAdd />
      );

      // Open the dropdown
      const trigger = screen.getByRole("button");
      await user.click(trigger);

      // Wait for dropdown content to appear
      await waitFor(() => {
        expect(screen.getByText("Open Program")).toBeInTheDocument();
      });

      // Click "Add new" button
      const addNewButton = screen.getByText("Add new");
      await user.click(addNewButton);

      // Type the name of the open program and submit
      const input = screen.getByPlaceholderText("Program name...");
      await user.type(input, "Open Program");
      await user.keyboard("{Enter}");

      // Should NOT show error toast
      expect(toast.error).not.toHaveBeenCalled();

      // Should call setSelectedProgram with the existing open program
      expect(mockSetSelectedProgram).toHaveBeenCalledWith(openProgram);

      // Should call setValue with programId and title
      expect(mockSetValue).toHaveBeenCalledWith("programId", "open-1");
      expect(mockSetValue).toHaveBeenCalledWith("title", "Open Program", {
        shouldValidate: true,
      });
    });

    it("should allow addCustom for a completely new program name", async () => {
      const user = userEvent.setup();

      render(
        <GrantTitleDropdown {...defaultProps} list={[]} canAdd />
      );

      // Open the dropdown
      const trigger = screen.getByRole("button");
      await user.click(trigger);

      // Click "Add new" button
      const addNewButton = screen.getByText("Add new");
      await user.click(addNewButton);

      // Type a new program name and submit
      const input = screen.getByPlaceholderText("Program name...");
      await user.type(input, "Brand New Program");
      await user.keyboard("{Enter}");

      // Should NOT show error toast
      expect(toast.error).not.toHaveBeenCalled();

      // Should call setSelectedProgram with a new program object
      expect(mockSetSelectedProgram).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ title: "Brand New Program" }),
        })
      );

      // Should call setValue with undefined programId (new program) and the title
      expect(mockSetValue).toHaveBeenCalledWith("programId", undefined);
      expect(mockSetValue).toHaveBeenCalledWith("title", "Brand New Program", {
        shouldValidate: true,
      });
    });
  });

  describe("visual styling for restricted programs", () => {
    it("should apply reduced opacity to restricted program button", async () => {
      const restrictedProgram = createMockProgram({
        programId: "restricted-1",
        metadata: {
          title: "Restricted Program",
          description: "A restricted program",
          status: "Active",
          anyoneCanJoin: false,
        },
      });

      render(<GrantTitleDropdown {...defaultProps} list={[restrictedProgram]} />);

      // Open the dropdown
      const trigger = screen.getByRole("button");
      fireEvent.click(trigger);

      // Wait for dropdown content to appear
      await waitFor(() => {
        expect(screen.getByText("Restricted Program")).toBeInTheDocument();
      });

      // Find the button containing the restricted program
      const programButton = screen.getByText("Restricted Program").closest("button");
      expect(programButton).toHaveClass("opacity-60");
      expect(programButton).toHaveClass("cursor-not-allowed");
    });
  });
});
