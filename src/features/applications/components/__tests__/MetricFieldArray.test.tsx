import { fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";
import type { ApplicationFormData } from "../../types";
import { MetricFieldArray } from "../MetricFieldArray";

const question: ApplicationQuestion = {
  id: "metrics",
  type: "metric",
  label: "Impact Metrics",
  required: true,
  validation: { minMetrics: 1, maxMetrics: 5 },
};

function Harness() {
  const { control } = useForm<ApplicationFormData>({
    defaultValues: { metrics: [] } as Partial<ApplicationFormData>,
  });
  return <MetricFieldArray control={control} name="metrics" question={question} />;
}

describe("MetricFieldArray — sequential sub-field edits", () => {
  it("retains earlier sub-fields when a later one is edited", () => {
    render(<Harness />);

    fireEvent.click(screen.getByTestId("add-metric-btn"));

    // Fill the four sub-fields in order, mirroring how a user types.
    fireEvent.change(screen.getByTestId("metric-name-input-0"), {
      target: { value: "Monthly active users" },
    });
    fireEvent.change(screen.getByTestId("metric-data-source-input-0"), {
      target: { value: "Dune analytics" },
    });
    fireEvent.change(screen.getByTestId("metric-how-measured-input-0"), {
      target: { value: "Count of unique users" },
    });
    fireEvent.change(screen.getByTestId("metric-target-input-0"), {
      target: { value: "10,000 by Q4" },
    });

    // Editing the Target must not clear the earlier fields.
    expect(screen.getByTestId("metric-name-input-0")).toHaveValue("Monthly active users");
    expect(screen.getByTestId("metric-data-source-input-0")).toHaveValue("Dune analytics");
    expect(screen.getByTestId("metric-how-measured-input-0")).toHaveValue("Count of unique users");
    expect(screen.getByTestId("metric-target-input-0")).toHaveValue("10,000 by Q4");
  });
});
