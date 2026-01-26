import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { VirtualizedDatapointsTable } from "@/components/Pages/Project/Impact/VirtualizedDatapointsTable";
import type { OutputForm } from "@/types/impact";

// Mock the parseProofUrls utility
jest.mock("@/utilities/impact", () => ({
  parseProofUrls: (proof: string) => {
    if (!proof) return [];
    const urlPattern = /https?:\/\/[^\s]+/g;
    return proof.match(urlPattern) || [];
  },
}));

// Mock formatDate utility
jest.mock("@/utilities/formatDate", () => ({
  formatDate: (date: Date) => date.toISOString().split("T")[0],
}));

// Mock @tanstack/react-virtual to work with JSDOM
// JSDOM doesn't support layout measurements, so we mock the virtualizer
// to return all items as visible for testing purposes
jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 10) }, (_, index) => ({
        index,
        key: index,
        start: index * 56,
        size: 56,
        end: (index + 1) * 56,
      })),
    getTotalSize: () => count * 56,
    scrollToIndex: jest.fn(),
    measureElement: jest.fn(),
  }),
}));

// Helper to create a mock form with datapoints
const createMockForm = (datapointCount: number, isEditing = true): OutputForm => ({
  id: "test-form-id",
  categoryId: "test-category",
  unitOfMeasure: "int",
  datapoints: Array.from({ length: datapointCount }, (_, i) => ({
    value: i + 100,
    proof: `https://example.com/proof-${i}`,
    startDate: `2024-0${(i % 9) + 1}-01T00:00:00Z`,
    endDate: `2024-0${(i % 9) + 1}-15T00:00:00Z`,
    outputTimestamp: `2024-0${(i % 9) + 1}-15T00:00:00Z`,
  })),
  isEditing,
  isSaving: false,
  isEdited: false,
});

describe("VirtualizedDatapointsTable", () => {
  const defaultProps = {
    itemId: "test-item-id",
    itemName: "Test Indicator",
    form: createMockForm(50),
    isAuthorized: true,
    isAutosynced: false,
    onInputChange: jest.fn(),
    onDeleteEntry: jest.fn(),
    onAddEntry: jest.fn(),
    isInvalidValue: jest.fn(() => false),
    isInvalidTimestamp: jest.fn(() => false),
    hasInvalidDatesSameRow: jest.fn(() => false),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the header row with correct columns", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      expect(screen.getByText("Test Indicator")).toBeInTheDocument();
      expect(screen.getByText("Start Date")).toBeInTheDocument();
      expect(screen.getByText("End Date")).toBeInTheDocument();
      expect(screen.getByText("Proof")).toBeInTheDocument();
    });

    it("should render a virtualized container", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      const scrollableRegion = screen.getByRole("rowgroup", {
        name: /scrollable region/i,
      });
      expect(scrollableRegion).toBeInTheDocument();
    });

    it("should render the Add new entry button when in editing mode", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      expect(screen.getByText("Add new entry")).toBeInTheDocument();
    });

    it("should not render the Add new entry button when not authorized", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} isAuthorized={false} />);

      expect(screen.queryByText("Add new entry")).not.toBeInTheDocument();
    });

    it("should not render the Add new entry button when not editing", () => {
      const form = createMockForm(50, false);
      render(<VirtualizedDatapointsTable {...defaultProps} form={form} />);

      expect(screen.queryByText("Add new entry")).not.toBeInTheDocument();
    });

    it("should render visible rows from virtualized list", () => {
      const { container } = render(<VirtualizedDatapointsTable {...defaultProps} />);

      // With our mock, we render up to 10 items
      const renderedRows = container.querySelectorAll('[role="row"]');
      expect(renderedRows.length).toBe(10);
    });
  });

  describe("Editing Mode", () => {
    it("should render input fields for value when editing", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      // Should find number inputs for visible rows
      const valueInputs = screen.getAllByRole("spinbutton");
      expect(valueInputs.length).toBe(10); // Mock renders 10 items
    });

    it("should render date inputs for dates when editing", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      // Should find date inputs for start and end dates
      const startDateInputs = screen.getAllByLabelText(/start date for entry/i);
      const endDateInputs = screen.getAllByLabelText(/end date for entry/i);
      expect(startDateInputs.length).toBe(10);
      expect(endDateInputs.length).toBe(10);
    });

    it("should render delete buttons when editing", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      const deleteButtons = screen.getAllByRole("button", { name: /delete entry/i });
      expect(deleteButtons.length).toBe(10);
    });

    it("should call onInputChange when value is changed", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      const valueInputs = screen.getAllByRole("spinbutton");
      fireEvent.change(valueInputs[0], { target: { value: "500" } });

      expect(defaultProps.onInputChange).toHaveBeenCalledWith("test-item-id", "value", "500", 0);
    });

    it("should call onInputChange when start date is changed", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      const dateInputs = screen.getAllByLabelText(/start date for entry/i);
      fireEvent.change(dateInputs[0], { target: { value: "2024-06-01" } });

      expect(defaultProps.onInputChange).toHaveBeenCalledWith(
        "test-item-id",
        "startDate",
        "2024-06-01",
        0
      );
    });

    it("should call onInputChange when end date is changed", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      const dateInputs = screen.getAllByLabelText(/end date for entry/i);
      fireEvent.change(dateInputs[0], { target: { value: "2024-06-15" } });

      expect(defaultProps.onInputChange).toHaveBeenCalledWith(
        "test-item-id",
        "endDate",
        "2024-06-15",
        0
      );
    });

    it("should call onDeleteEntry when delete button is clicked", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      const deleteButtons = screen.getAllByRole("button", { name: /delete entry/i });
      fireEvent.click(deleteButtons[0]);

      expect(defaultProps.onDeleteEntry).toHaveBeenCalledWith("test-item-id", 0);
    });

    it("should call onAddEntry when Add new entry button is clicked", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      const addButton = screen.getByText("Add new entry");
      fireEvent.click(addButton);

      expect(defaultProps.onAddEntry).toHaveBeenCalledWith("test-item-id");
    });
  });

  describe("Read-Only Mode", () => {
    it("should render static text values when not editing", () => {
      const form = createMockForm(10, false);
      render(<VirtualizedDatapointsTable {...defaultProps} form={form} />);

      // Should not have editable inputs
      const valueInputs = screen.queryAllByRole("spinbutton");
      expect(valueInputs.length).toBe(0);
    });

    it("should not render delete buttons when not editing", () => {
      const form = createMockForm(10, false);
      render(<VirtualizedDatapointsTable {...defaultProps} form={form} />);

      const deleteButtons = screen.queryAllByRole("button", { name: /delete entry/i });
      expect(deleteButtons.length).toBe(0);
    });

    it("should render static date values when not editing", () => {
      const form = createMockForm(10, false);
      render(<VirtualizedDatapointsTable {...defaultProps} form={form} />);

      // Date inputs should not be present
      const dateInputs = screen.queryAllByLabelText(/date for entry/i);
      expect(dateInputs.length).toBe(0);
    });
  });

  describe("Validation", () => {
    it("should show error styling for invalid values", () => {
      const isInvalidValue = jest.fn(() => true);
      render(<VirtualizedDatapointsTable {...defaultProps} isInvalidValue={isInvalidValue} />);

      // Error messages should be present
      const errorMessages = screen.getAllByRole("alert");
      expect(errorMessages.length).toBe(10); // One per visible row
    });

    it("should show correct error message for integer validation", () => {
      const isInvalidValue = jest.fn(() => true);
      const form = { ...createMockForm(5), unitOfMeasure: "int" as const };
      render(
        <VirtualizedDatapointsTable {...defaultProps} form={form} isInvalidValue={isInvalidValue} />
      );

      const errorMessages = screen.getAllByText("Please enter an integer number");
      expect(errorMessages.length).toBe(5);
    });

    it("should show correct error message for float validation", () => {
      const isInvalidValue = jest.fn(() => true);
      const form = { ...createMockForm(5), unitOfMeasure: "float" as const };
      render(
        <VirtualizedDatapointsTable {...defaultProps} form={form} isInvalidValue={isInvalidValue} />
      );

      const errorMessages = screen.getAllByText("Please enter a valid number");
      expect(errorMessages.length).toBe(5);
    });

    it("should apply error border to invalid date inputs", () => {
      const hasInvalidDatesSameRow = jest.fn(() => true);
      render(
        <VirtualizedDatapointsTable
          {...defaultProps}
          hasInvalidDatesSameRow={hasInvalidDatesSameRow}
        />
      );

      const dateInputs = screen.getAllByLabelText(/date for entry/i);
      // All inputs should have error styling
      dateInputs.forEach((input) => {
        expect(input.className).toContain("border-red-500");
      });
    });

    it("should set aria-invalid on invalid value inputs", () => {
      const isInvalidValue = jest.fn(() => true);
      render(<VirtualizedDatapointsTable {...defaultProps} isInvalidValue={isInvalidValue} />);

      const valueInputs = screen.getAllByRole("spinbutton");
      valueInputs.forEach((input) => {
        expect(input).toHaveAttribute("aria-invalid", "true");
      });
    });
  });

  describe("Proof URLs", () => {
    it("should render proof URL inputs when editing", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      const proofInputs = screen.getAllByLabelText(/proof url/i);
      expect(proofInputs.length).toBe(10);
    });

    it("should call onInputChange when proof URL is changed", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      const proofInputs = screen.getAllByLabelText(/proof url/i);
      fireEvent.change(proofInputs[0], { target: { value: "https://new-proof.com" } });

      expect(defaultProps.onInputChange).toHaveBeenCalledWith(
        "test-item-id",
        "proof",
        "https://new-proof.com",
        0
      );
    });

    it("should render proof links when not editing", () => {
      const form = createMockForm(5, false);
      render(<VirtualizedDatapointsTable {...defaultProps} form={form} />);

      const links = screen.getAllByRole("link");
      expect(links.length).toBe(5);
    });

    it("should show 'No proof provided' when proof is empty in read mode", () => {
      const form = createMockForm(5, false);
      form.datapoints = form.datapoints.map((dp) => ({ ...dp, proof: "" }));
      render(<VirtualizedDatapointsTable {...defaultProps} form={form} />);

      const noProofTexts = screen.getAllByText("No proof provided");
      expect(noProofTexts.length).toBe(5);
    });
  });

  describe("Auto-synced Indicator", () => {
    it("should not render value inputs when auto-synced", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} isAutosynced={true} />);

      // Value inputs should not be rendered for auto-synced indicators
      const valueInputs = screen.queryAllByRole("spinbutton");
      expect(valueInputs.length).toBe(0);
    });

    it("should still render static values for auto-synced indicators", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} isAutosynced={true} />);

      // Should display the values as text
      expect(screen.getByText("100")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels for value inputs", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      const valueInputs = screen.getAllByLabelText(/test indicator value for entry/i);
      expect(valueInputs.length).toBe(10);
    });

    it("should have proper ARIA labels for date inputs", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      expect(screen.getAllByLabelText(/start date for entry/i).length).toBe(10);
      expect(screen.getAllByLabelText(/end date for entry/i).length).toBe(10);
    });

    it("should have proper ARIA labels for delete buttons", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      expect(screen.getAllByLabelText(/delete entry/i).length).toBe(10);
    });

    it("should have columnheader roles for header cells", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      const headers = screen.getAllByRole("columnheader");
      expect(headers.length).toBe(5); // Name, Start Date, End Date, Proof, Actions
    });

    it("should have row roles for data rows", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      const rows = screen.getAllByRole("row");
      expect(rows.length).toBe(10);
    });

    it("should have aria-describedby for invalid value inputs", () => {
      const isInvalidValue = jest.fn(() => true);
      render(<VirtualizedDatapointsTable {...defaultProps} isInvalidValue={isInvalidValue} />);

      const valueInputs = screen.getAllByRole("spinbutton");
      valueInputs.forEach((input, index) => {
        expect(input).toHaveAttribute("aria-describedby", `value-error-test-item-id-${index}`);
      });
    });
  });

  describe("Scroll to Index", () => {
    it("should accept scrollToIndex prop without errors", () => {
      expect(() => {
        render(<VirtualizedDatapointsTable {...defaultProps} scrollToIndex={10} />);
      }).not.toThrow();
    });
  });

  describe("Unit of Measure Display", () => {
    it("should display the unit of measure badge for each value input", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      const badges = screen.getAllByText("int");
      expect(badges.length).toBe(10);
    });

    it("should display float unit of measure when set", () => {
      const form = { ...createMockForm(5), unitOfMeasure: "float" as const };
      render(<VirtualizedDatapointsTable {...defaultProps} form={form} />);

      const badges = screen.getAllByText("float");
      expect(badges.length).toBe(5);
    });
  });

  describe("Empty State", () => {
    it("should render correctly with empty datapoints array", () => {
      const form = { ...createMockForm(0) };
      render(<VirtualizedDatapointsTable {...defaultProps} form={form} />);

      // Should still render the header
      expect(screen.getByText("Test Indicator")).toBeInTheDocument();
      // No rows should be rendered
      const rows = screen.queryAllByRole("row");
      expect(rows.length).toBe(0);
    });
  });

  describe("Data Index Tracking", () => {
    it("should pass correct index to onInputChange", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      const valueInputs = screen.getAllByRole("spinbutton");

      // Test first input
      fireEvent.change(valueInputs[0], { target: { value: "999" } });
      expect(defaultProps.onInputChange).toHaveBeenLastCalledWith(
        "test-item-id",
        "value",
        "999",
        0
      );

      // Test third input
      fireEvent.change(valueInputs[2], { target: { value: "888" } });
      expect(defaultProps.onInputChange).toHaveBeenLastCalledWith(
        "test-item-id",
        "value",
        "888",
        2
      );
    });

    it("should pass correct index to onDeleteEntry", () => {
      render(<VirtualizedDatapointsTable {...defaultProps} />);

      const deleteButtons = screen.getAllByRole("button", { name: /delete entry/i });

      fireEvent.click(deleteButtons[3]);
      expect(defaultProps.onDeleteEntry).toHaveBeenCalledWith("test-item-id", 3);

      fireEvent.click(deleteButtons[7]);
      expect(defaultProps.onDeleteEntry).toHaveBeenCalledWith("test-item-id", 7);
    });
  });
});
