import { fireEvent, render, screen } from "@testing-library/react";
import {
  ConfirmationCard,
  flattenPreviewData,
  formatToolLabel,
} from "@/components/AgentChat/ConfirmationCard";
import type { ToolResultData } from "@/store/agentChat";

describe("formatToolLabel", () => {
  it("should strip 'preview_' prefix and title-case words", () => {
    expect(formatToolLabel("preview_update_project")).toBe("Update Project");
  });

  it("should handle multi-word tool names", () => {
    expect(formatToolLabel("preview_create_milestone")).toBe("Create Milestone");
  });

  it("should handle names without preview_ prefix", () => {
    expect(formatToolLabel("commit_update_program")).toBe("Commit Update Program");
  });
});

describe("flattenPreviewData", () => {
  it("should flatten simple key-value pairs", () => {
    const result = flattenPreviewData({ name: "Test", status: "active" });
    expect(result).toEqual([
      { label: "name", value: "Test" },
      { label: "status", value: "active" },
    ]);
  });

  it("should flatten nested objects with dot notation", () => {
    const result = flattenPreviewData({
      details: { name: "Nested", count: 5 },
    });
    expect(result).toEqual([
      { label: "details.name", value: "Nested" },
      { label: "details.count", value: "5" },
    ]);
  });

  it("should handle null values", () => {
    const result = flattenPreviewData({ field: null });
    expect(result).toEqual([{ label: "field", value: "" }]);
  });

  it("should handle arrays as string values", () => {
    const result = flattenPreviewData({ tags: ["a", "b"] });
    expect(result).toEqual([{ label: "tags", value: "a,b" }]);
  });

  it("should handle deeply nested objects", () => {
    const result = flattenPreviewData({
      a: { b: { c: "deep" } },
    });
    expect(result).toEqual([{ label: "a.b.c", value: "deep" }]);
  });
});

describe("ConfirmationCard", () => {
  const baseToolResult: ToolResultData = {
    type: "preview",
    toolName: "preview_update_project",
    data: { name: "New Project Name", description: "Updated description" },
    status: "pending",
  };

  const defaultProps = {
    toolResult: baseToolResult,
    onApprove: jest.fn(),
    onDeny: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the card with correct test id", () => {
    render(<ConfirmationCard {...defaultProps} />);
    expect(screen.getByTestId("confirmation-card")).toBeInTheDocument();
  });

  it("should display formatted tool label", () => {
    render(<ConfirmationCard {...defaultProps} />);
    expect(screen.getByText("Proposed: Update Project")).toBeInTheDocument();
  });

  it("should display preview data rows", () => {
    render(<ConfirmationCard {...defaultProps} />);
    expect(screen.getByText("name:")).toBeInTheDocument();
    expect(screen.getByText("New Project Name")).toBeInTheDocument();
    expect(screen.getByText("description:")).toBeInTheDocument();
    expect(screen.getByText("Updated description")).toBeInTheDocument();
  });

  it("should show approve and deny buttons when status is pending", () => {
    render(<ConfirmationCard {...defaultProps} />);
    expect(screen.getByTestId("confirm-approve")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-deny")).toBeInTheDocument();
  });

  it("should call onApprove when approve button clicked", () => {
    const onApprove = jest.fn();
    render(<ConfirmationCard {...defaultProps} onApprove={onApprove} />);
    fireEvent.click(screen.getByTestId("confirm-approve"));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it("should call onDeny when deny button clicked", () => {
    const onDeny = jest.fn();
    render(<ConfirmationCard {...defaultProps} onDeny={onDeny} />);
    fireEvent.click(screen.getByTestId("confirm-deny"));
    expect(onDeny).toHaveBeenCalledTimes(1);
  });

  it("should disable buttons when disabled prop is true", () => {
    render(<ConfirmationCard {...defaultProps} disabled={true} />);
    expect(screen.getByTestId("confirm-approve")).toBeDisabled();
    expect(screen.getByTestId("confirm-deny")).toBeDisabled();
  });

  it("should show 'Approved' status when status is approved", () => {
    const toolResult: ToolResultData = {
      ...baseToolResult,
      status: "approved",
    };
    render(<ConfirmationCard {...defaultProps} toolResult={toolResult} />);
    expect(screen.getByTestId("confirmation-status")).toHaveTextContent("Approved");
    expect(screen.queryByTestId("confirm-approve")).not.toBeInTheDocument();
    expect(screen.queryByTestId("confirm-deny")).not.toBeInTheDocument();
  });

  it("should show 'Denied' status when status is denied", () => {
    const toolResult: ToolResultData = {
      ...baseToolResult,
      status: "denied",
    };
    render(<ConfirmationCard {...defaultProps} toolResult={toolResult} />);
    expect(screen.getByTestId("confirmation-status")).toHaveTextContent("Denied");
    expect(screen.queryByTestId("confirm-approve")).not.toBeInTheDocument();
    expect(screen.queryByTestId("confirm-deny")).not.toBeInTheDocument();
  });

  it("should handle nested data in preview", () => {
    const toolResult: ToolResultData = {
      ...baseToolResult,
      data: { settings: { visibility: "public" } },
    };
    render(<ConfirmationCard {...defaultProps} toolResult={toolResult} />);
    expect(screen.getByText("settings.visibility:")).toBeInTheDocument();
    expect(screen.getByText("public")).toBeInTheDocument();
  });

  it("should handle empty data object", () => {
    const toolResult: ToolResultData = {
      ...baseToolResult,
      data: {},
    };
    render(<ConfirmationCard {...defaultProps} toolResult={toolResult} />);
    expect(screen.getByTestId("confirmation-card")).toBeInTheDocument();
    // No data rows should be rendered
    expect(screen.queryByRole("definition")).not.toBeInTheDocument();
  });
});
