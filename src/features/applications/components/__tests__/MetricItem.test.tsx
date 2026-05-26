import { fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import type { ApplicationFormData } from "../../types";
import { MetricItem } from "../MetricItem";

const mockOnRemove = vi.fn();

interface HarnessProps {
  canRemove?: boolean;
  disabled?: boolean;
  defaultValues?: Record<string, unknown>;
}

function Harness({ canRemove = true, disabled = false, defaultValues }: HarnessProps) {
  const { control } = useForm<ApplicationFormData>({
    defaultValues: (defaultValues ?? {
      metrics: [{ metric: "", dataSource: "", howItsMeasured: "", target: "" }],
    }) as Partial<ApplicationFormData>,
  });
  return (
    <MetricItem
      index={0}
      namePrefix="metrics"
      control={control}
      canRemove={canRemove}
      disabled={disabled}
      onRemove={mockOnRemove}
    />
  );
}

describe("MetricItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all four sub-fields with their values", () => {
    render(
      <Harness
        defaultValues={{
          metrics: [
            {
              metric: "Monthly active users",
              dataSource: "Dune analytics",
              howItsMeasured: "Unique wallets",
              target: "10,000 by Q4",
            },
          ],
        }}
      />
    );

    expect(screen.getByText("Metric 1")).toBeInTheDocument();
    expect(screen.getByTestId("metric-name-input-0")).toHaveValue("Monthly active users");
    expect(screen.getByTestId("metric-data-source-input-0")).toHaveValue("Dune analytics");
    expect(screen.getByTestId("metric-how-measured-input-0")).toHaveValue("Unique wallets");
    expect(screen.getByTestId("metric-target-input-0")).toHaveValue("10,000 by Q4");
  });

  it("calls onRemove when the remove button is clicked", () => {
    render(<Harness />);

    fireEvent.click(screen.getByTestId("remove-metric-btn-0"));

    expect(mockOnRemove).toHaveBeenCalledTimes(1);
  });

  it("hides the remove button when canRemove is false", () => {
    render(<Harness canRemove={false} />);

    expect(screen.queryByTestId("remove-metric-btn-0")).not.toBeInTheDocument();
  });
});
