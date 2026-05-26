import { fireEvent, render, screen } from "@testing-library/react";
import type { MetricData } from "@/types/whitelabel-entities";
import { MetricItem } from "../MetricItem";

describe("MetricItem", () => {
  const mockMetric: MetricData = {
    metric: "Monthly active users",
    dataSource: "Dune Analytics dashboard",
    howItsMeasured: "Unique wallets interacting with the contract",
    target: "10,000 by Q4",
  };

  const mockOnUpdate = vi.fn();
  const mockOnRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all four metric sub-fields", () => {
    render(
      <MetricItem
        index={0}
        metric={mockMetric}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
        canRemove={true}
      />
    );

    expect(screen.getByText("Metric 1")).toBeInTheDocument();
    expect(screen.getByTestId("metric-name-input-0")).toHaveValue("Monthly active users");
    expect(screen.getByTestId("metric-data-source-input-0")).toHaveValue(
      "Dune Analytics dashboard"
    );
    expect(screen.getByTestId("metric-how-measured-input-0")).toHaveValue(
      "Unique wallets interacting with the contract"
    );
    expect(screen.getByTestId("metric-target-input-0")).toHaveValue("10,000 by Q4");
  });

  it("should call onUpdate with the changed sub-field, preserving the rest", () => {
    render(
      <MetricItem
        index={0}
        metric={mockMetric}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
        canRemove={true}
      />
    );

    fireEvent.change(screen.getByTestId("metric-target-input-0"), {
      target: { value: "25,000 by Q4" },
    });

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: "Monthly active users",
        target: "25,000 by Q4",
      })
    );
  });

  it("should hide the remove button when canRemove is false", () => {
    render(
      <MetricItem
        index={0}
        metric={mockMetric}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
        canRemove={false}
      />
    );

    expect(screen.queryByTestId("remove-metric-btn-0")).not.toBeInTheDocument();
  });
});
