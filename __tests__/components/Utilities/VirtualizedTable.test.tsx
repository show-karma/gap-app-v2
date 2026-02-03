/**
 * @file Tests for VirtualizedTable component
 * @description Comprehensive tests covering rendering, virtualization behavior,
 * accessibility, user interactions, and edge cases
 */

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import {
  VirtualizedTable,
  type VirtualizedTableColumn,
  type VirtualizedTableProps,
} from "@/components/Utilities/VirtualizedTable";

// Mock @tanstack/react-virtual to control virtualization in tests
jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: jest.fn(({ count, estimateSize }) => ({
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 20) }, (_, index) => ({
        index,
        start: index * estimateSize(),
        size: estimateSize(),
        key: index,
      })),
    getTotalSize: () => count * estimateSize(),
    scrollToIndex: jest.fn(),
    measure: jest.fn(),
  })),
}));

// Mock data type for testing
interface TestItem {
  id: string;
  name: string;
  value: number;
  status: string;
}

// Helper to generate test data
const generateTestData = (count: number): TestItem[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
    value: i * 10,
    status: i % 2 === 0 ? "active" : "inactive",
  }));

// Default test columns
const defaultColumns: VirtualizedTableColumn<TestItem>[] = [
  { id: "name", header: "Name", accessor: (row) => row.name },
  { id: "value", header: "Value", accessor: (row) => row.value },
  { id: "status", header: "Status", accessor: (row) => row.status },
];

// Helper to render component with defaults
const renderVirtualizedTable = (props: Partial<VirtualizedTableProps<TestItem>> = {}) => {
  const defaultProps: VirtualizedTableProps<TestItem> = {
    data: generateTestData(10),
    columns: defaultColumns,
    ...props,
  };
  return render(<VirtualizedTable {...defaultProps} />);
};

describe("VirtualizedTable", () => {
  describe("Rendering", () => {
    it("should render table with headers", () => {
      renderVirtualizedTable();

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Value")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
    });

    it("should render data rows", () => {
      renderVirtualizedTable({ data: generateTestData(5) });

      expect(screen.getByText("Item 0")).toBeInTheDocument();
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
    });

    it("should apply custom containerHeight", () => {
      const { container } = renderVirtualizedTable({ containerHeight: 600 });

      // Find the scrollable container (first div with overflow-auto class)
      const scrollContainer = container.querySelector(".overflow-auto");
      expect(scrollContainer).toHaveStyle({ height: "600px" });
    });

    it("should apply custom className to container", () => {
      const { container } = renderVirtualizedTable({ className: "custom-class" });

      const scrollContainer = container.querySelector(".overflow-auto");
      expect(scrollContainer).toHaveClass("custom-class");
    });

    it("should apply custom tableClassName", () => {
      renderVirtualizedTable({ tableClassName: "custom-table" });

      expect(screen.getByRole("table")).toHaveClass("custom-table");
    });

    it("should render with ariaLabel", () => {
      renderVirtualizedTable({ ariaLabel: "Test data table" });

      expect(screen.getByRole("table")).toHaveAttribute("aria-label", "Test data table");
    });
  });

  describe("Column Configuration", () => {
    it("should render column with cell renderer", () => {
      const columnsWithCell: VirtualizedTableColumn<TestItem>[] = [
        {
          id: "name",
          header: "Name",
          cell: (row) => <strong data-testid="bold-name">{row.name}</strong>,
        },
      ];

      renderVirtualizedTable({ columns: columnsWithCell, data: generateTestData(3) });

      expect(screen.getAllByTestId("bold-name").length).toBeGreaterThan(0);
      expect(screen.getByText("Item 0")).toBeInTheDocument();
    });

    it("should apply column width styles", () => {
      const columnsWithWidth: VirtualizedTableColumn<TestItem>[] = [
        { id: "name", header: "Name", accessor: (row) => row.name, width: 200 },
        { id: "value", header: "Value", accessor: (row) => row.value, width: "150px" },
      ];

      const { container } = renderVirtualizedTable({
        columns: columnsWithWidth,
        data: generateTestData(3),
      });

      const headers = container.querySelectorAll("th");
      expect(headers[0]).toHaveStyle({ width: "200px" });
      expect(headers[1]).toHaveStyle({ width: "150px" });
    });

    it("should apply minWidth and maxWidth styles", () => {
      const columnsWithMinMax: VirtualizedTableColumn<TestItem>[] = [
        {
          id: "name",
          header: "Name",
          accessor: (row) => row.name,
          minWidth: 100,
          maxWidth: 300,
        },
      ];

      const { container } = renderVirtualizedTable({
        columns: columnsWithMinMax,
        data: generateTestData(3),
      });

      const header = container.querySelector("th");
      expect(header).toHaveStyle({ minWidth: "100px", maxWidth: "300px" });
    });

    it("should apply headerClassName to column headers", () => {
      const columnsWithHeaderClass: VirtualizedTableColumn<TestItem>[] = [
        {
          id: "name",
          header: "Name",
          accessor: (row) => row.name,
          headerClassName: "custom-header",
        },
      ];

      const { container } = renderVirtualizedTable({
        columns: columnsWithHeaderClass,
        data: generateTestData(3),
      });

      const header = container.querySelector("th");
      expect(header).toHaveClass("custom-header");
    });

    it("should apply cellClassName to cells", () => {
      const columnsWithCellClass: VirtualizedTableColumn<TestItem>[] = [
        {
          id: "name",
          header: "Name",
          accessor: (row) => row.name,
          cellClassName: "custom-cell",
        },
      ];

      const { container } = renderVirtualizedTable({
        columns: columnsWithCellClass,
        data: generateTestData(3),
      });

      const cells = container.querySelectorAll("td");
      expect(cells[0]).toHaveClass("custom-cell");
    });

    it("should prefer cell over accessor when both provided", () => {
      const columnsWithBoth: VirtualizedTableColumn<TestItem>[] = [
        {
          id: "name",
          header: "Name",
          accessor: (row) => row.name,
          cell: (row) => <span data-testid="cell-render">Cell: {row.name}</span>,
        },
      ];

      renderVirtualizedTable({ columns: columnsWithBoth, data: generateTestData(2) });

      // Cell renderer should be used, not accessor
      expect(screen.getAllByTestId("cell-render").length).toBeGreaterThan(0);
      expect(screen.getByText("Cell: Item 0")).toBeInTheDocument();
    });
  });

  describe("Row Configuration", () => {
    it("should use getRowKey for row keys", () => {
      const getRowKey = jest.fn((item: TestItem) => item.id);

      renderVirtualizedTable({
        data: generateTestData(5),
        getRowKey,
      });

      expect(getRowKey).toHaveBeenCalled();
    });

    it("should apply rowClassName as string", () => {
      const { container } = renderVirtualizedTable({
        data: generateTestData(3),
        rowClassName: "custom-row",
      });

      const rows = container.querySelectorAll("tbody tr");
      rows.forEach((row) => {
        expect(row).toHaveClass("custom-row");
      });
    });

    it("should apply rowClassName as function", () => {
      const { container } = renderVirtualizedTable({
        data: generateTestData(3),
        rowClassName: (_item, index) => (index % 2 === 0 ? "even-row" : "odd-row"),
      });

      const rows = container.querySelectorAll("tbody tr");
      // At least some rows should have the classes
      const hasEvenRow = Array.from(rows).some((row) => row.classList.contains("even-row"));
      const hasOddRow = Array.from(rows).some((row) => row.classList.contains("odd-row"));
      expect(hasEvenRow).toBe(true);
      expect(hasOddRow).toBe(true);
    });

    it("should render custom rows with renderRow prop", () => {
      const renderRow = (item: TestItem) => (
        <td colSpan={3} data-testid="custom-row">
          Custom: {item.name}
        </td>
      );

      renderVirtualizedTable({
        data: generateTestData(3),
        renderRow,
      });

      expect(screen.getAllByTestId("custom-row").length).toBeGreaterThan(0);
      expect(screen.getByText("Custom: Item 0")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should show default empty message when data is empty", () => {
      renderVirtualizedTable({ data: [] });

      expect(screen.getByText("No data available")).toBeInTheDocument();
    });

    it("should show custom empty message", () => {
      renderVirtualizedTable({ data: [], emptyMessage: "Nothing to display" });

      expect(screen.getByText("Nothing to display")).toBeInTheDocument();
    });

    it("should render custom empty component", () => {
      const emptyComponent = <div data-testid="custom-empty">Custom empty state</div>;

      renderVirtualizedTable({ data: [], emptyComponent });

      expect(screen.getByTestId("custom-empty")).toBeInTheDocument();
    });

    it("should render empty state container", () => {
      const { container } = renderVirtualizedTable({ data: [] });

      // Empty state should be rendered
      const emptyContainer = container.querySelector(".flex.items-center.justify-center");
      expect(emptyContainer).toBeInTheDocument();
    });

    it("should not render table when empty", () => {
      renderVirtualizedTable({ data: [] });

      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("should show default loading spinner when isLoading is true", () => {
      renderVirtualizedTable({ isLoading: true });

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should render custom loading component", () => {
      const loadingComponent = <div data-testid="custom-loading">Loading data...</div>;

      renderVirtualizedTable({ isLoading: true, loadingComponent });

      expect(screen.getByTestId("custom-loading")).toBeInTheDocument();
    });

    it("should have aria-busy for loading state", () => {
      const { container } = renderVirtualizedTable({ isLoading: true });

      const loadingContainer = container.querySelector('[aria-busy="true"]');
      expect(loadingContainer).toBeInTheDocument();
    });

    it("should not render table when loading", () => {
      renderVirtualizedTable({ isLoading: true });

      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("should apply containerHeight to loading state", () => {
      const { container } = renderVirtualizedTable({ isLoading: true, containerHeight: 500 });

      const loadingContainer = container.querySelector('[aria-busy="true"]');
      expect(loadingContainer).toHaveStyle({ height: "500px" });
    });
  });

  describe("Click Interactions", () => {
    it("should call onRowClick when row is clicked", async () => {
      const user = userEvent.setup();
      const handleRowClick = jest.fn();

      renderVirtualizedTable({
        data: generateTestData(5),
        onRowClick: handleRowClick,
      });

      const row = screen.getByText("Item 0").closest("tr");
      if (row) {
        await user.click(row);
        expect(handleRowClick).toHaveBeenCalledWith(
          expect.objectContaining({ id: "item-0", name: "Item 0" }),
          0
        );
      }
    });

    it("should add cursor-pointer class when clickableRows is true", () => {
      const { container } = renderVirtualizedTable({
        data: generateTestData(3),
        clickableRows: true,
      });

      const rows = container.querySelectorAll("tbody tr");
      rows.forEach((row) => {
        expect(row).toHaveClass("cursor-pointer");
      });
    });

    it("should support keyboard navigation with Enter key", async () => {
      const handleRowClick = jest.fn();

      const { container } = renderVirtualizedTable({
        data: generateTestData(5),
        onRowClick: handleRowClick,
      });

      const row = container.querySelector("tbody tr");
      if (row) {
        fireEvent.keyDown(row, { key: "Enter" });
        expect(handleRowClick).toHaveBeenCalled();
      }
    });

    it("should support keyboard navigation with Space key", async () => {
      const handleRowClick = jest.fn();

      const { container } = renderVirtualizedTable({
        data: generateTestData(5),
        onRowClick: handleRowClick,
      });

      const row = container.querySelector("tbody tr");
      if (row) {
        fireEvent.keyDown(row, { key: " " });
        expect(handleRowClick).toHaveBeenCalled();
      }
    });

    it("should have role=button and tabIndex when clickable", () => {
      const { container } = renderVirtualizedTable({
        data: generateTestData(3),
        onRowClick: jest.fn(),
      });

      const rows = container.querySelectorAll("tbody tr");
      rows.forEach((row) => {
        expect(row).toHaveAttribute("role", "button");
        expect(row).toHaveAttribute("tabIndex", "0");
      });
    });

    it("should not have role=button when not clickable", () => {
      const { container } = renderVirtualizedTable({
        data: generateTestData(3),
      });

      const rows = container.querySelectorAll("tbody tr");
      rows.forEach((row) => {
        expect(row).not.toHaveAttribute("role", "button");
      });
    });
  });

  describe("Sticky Header", () => {
    it("should have sticky header by default", () => {
      const { container } = renderVirtualizedTable();

      const thead = container.querySelector("thead");
      expect(thead).toHaveClass("sticky");
      expect(thead).toHaveClass("top-0");
      expect(thead).toHaveClass("z-10");
    });

    it("should not have sticky header when stickyHeader is false", () => {
      const { container } = renderVirtualizedTable({ stickyHeader: false });

      const thead = container.querySelector("thead");
      expect(thead).not.toHaveClass("sticky");
    });
  });

  describe("Virtualization", () => {
    it("should limit rendered rows based on virtualizer", () => {
      // With 100 items, the mock virtualizer limits to 20 items max
      const { container } = renderVirtualizedTable({
        data: generateTestData(100),
      });

      const rows = container.querySelectorAll("tbody tr");
      expect(rows.length).toBeLessThanOrEqual(20);
    });

    it("should apply transform styles to rows", () => {
      const { container } = renderVirtualizedTable({
        data: generateTestData(10),
        rowHeight: 50,
      });

      const rows = container.querySelectorAll("tbody tr");
      if (rows.length > 0) {
        // First row should be at top
        expect(rows[0]).toHaveStyle({ transform: "translateY(0px)" });
        // Second row should be offset by row height
        if (rows.length > 1) {
          expect(rows[1]).toHaveStyle({ transform: "translateY(50px)" });
        }
      }
    });

    it("should set row height correctly", () => {
      const { container } = renderVirtualizedTable({
        data: generateTestData(10),
        rowHeight: 60,
      });

      const rows = container.querySelectorAll("tbody tr");
      if (rows.length > 0) {
        expect(rows[0]).toHaveStyle({ height: "60px" });
      }
    });

    it("should set tbody height based on total size", () => {
      const { container } = renderVirtualizedTable({
        data: generateTestData(10),
        rowHeight: 48,
      });

      const tbody = container.querySelector("tbody");
      // 10 items * 48px = 480px
      expect(tbody).toHaveStyle({ height: "480px" });
    });
  });

  describe("Accessibility", () => {
    it("should have proper table structure", () => {
      renderVirtualizedTable();

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getAllByRole("columnheader").length).toBe(defaultColumns.length);
    });

    it("should have scope=col on header cells", () => {
      const { container } = renderVirtualizedTable();

      const headers = container.querySelectorAll("th");
      headers.forEach((header) => {
        expect(header).toHaveAttribute("scope", "col");
      });
    });

    it("should have scrollable container", () => {
      const { container } = renderVirtualizedTable();

      const scrollContainer = container.querySelector(".overflow-auto");
      expect(scrollContainer).toBeInTheDocument();
    });

    it("should use custom ariaLabel on table", () => {
      renderVirtualizedTable({ ariaLabel: "My data table" });

      // ariaLabel is applied to the table element
      expect(screen.getByRole("table")).toHaveAttribute("aria-label", "My data table");
    });
  });

  describe("Edge Cases", () => {
    it("should handle single row", () => {
      renderVirtualizedTable({ data: generateTestData(1) });

      expect(screen.getByText("Item 0")).toBeInTheDocument();
      expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
    });

    it("should handle items without id property", () => {
      interface ItemWithoutId {
        name: string;
        value: number;
      }

      const dataWithoutId: ItemWithoutId[] = [
        { name: "First", value: 1 },
        { name: "Second", value: 2 },
      ];

      const columns: VirtualizedTableColumn<ItemWithoutId>[] = [
        { id: "name", header: "Name", accessor: (row) => row.name },
      ];

      render(<VirtualizedTable data={dataWithoutId} columns={columns} />);

      expect(screen.getByText("First")).toBeInTheDocument();
      expect(screen.getByText("Second")).toBeInTheDocument();
    });

    it("should handle items with uid property", () => {
      interface ItemWithUid {
        uid: string;
        name: string;
      }

      const dataWithUid: ItemWithUid[] = [{ uid: "uid-1", name: "Item with uid" }];

      const columns: VirtualizedTableColumn<ItemWithUid>[] = [
        { id: "name", header: "Name", accessor: (row) => row.name },
      ];

      render(<VirtualizedTable data={dataWithUid} columns={columns} />);

      expect(screen.getByText("Item with uid")).toBeInTheDocument();
    });

    it("should handle null/undefined cell values gracefully", () => {
      const dataWithNull = [
        { id: "1", name: null, value: undefined, status: "ok" },
      ] as unknown as TestItem[];

      renderVirtualizedTable({ data: dataWithNull });

      // Should render without crashing
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("should handle columns without accessor or cell", () => {
      const columnsWithoutAccessor: VirtualizedTableColumn<TestItem>[] = [
        { id: "empty", header: "Empty Column" },
      ];

      renderVirtualizedTable({ columns: columnsWithoutAccessor, data: generateTestData(3) });

      expect(screen.getByText("Empty Column")).toBeInTheDocument();
    });

    it("should handle ReactNode headers", () => {
      const columnsWithReactHeader: VirtualizedTableColumn<TestItem>[] = [
        {
          id: "name",
          header: <span data-testid="custom-header">Custom Header</span>,
          accessor: (row) => row.name,
        },
      ];

      renderVirtualizedTable({ columns: columnsWithReactHeader, data: generateTestData(2) });

      expect(screen.getByTestId("custom-header")).toBeInTheDocument();
      expect(screen.getByText("Custom Header")).toBeInTheDocument();
    });
  });

  describe("Dark Mode Support", () => {
    it("should have dark mode classes on container", () => {
      const { container } = renderVirtualizedTable();

      const scrollContainer = container.querySelector(".overflow-auto");
      expect(scrollContainer?.className).toContain("dark:bg-zinc-800");
      expect(scrollContainer?.className).toContain("dark:border-zinc-700");
    });

    it("should have dark mode classes on header", () => {
      const { container } = renderVirtualizedTable();

      const thead = container.querySelector("thead");
      expect(thead?.className).toContain("dark:bg-zinc-800");
    });

    it("should have dark mode classes on tbody", () => {
      const { container } = renderVirtualizedTable();

      const tbody = container.querySelector("tbody");
      expect(tbody?.className).toContain("dark:bg-zinc-900");
    });

    it("should have dark mode classes on cells", () => {
      const { container } = renderVirtualizedTable({ data: generateTestData(1) });

      const cell = container.querySelector("td");
      expect(cell?.className).toContain("dark:text-zinc-100");
    });
  });

  describe("Custom Header Styling", () => {
    it("should apply headerClassName to thead", () => {
      const { container } = renderVirtualizedTable({ headerClassName: "custom-thead" });

      const thead = container.querySelector("thead");
      expect(thead).toHaveClass("custom-thead");
    });
  });
});
