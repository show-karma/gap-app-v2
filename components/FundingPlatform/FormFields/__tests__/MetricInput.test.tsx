/**
 * Tests for MetricInput Component (legacy FundingPlatform path).
 *
 * Verifies the repeatable metric field array: rendering, add/remove with
 * min/max limits, the pluralized minimum hint, disabled state, and the
 * field-level error passthrough.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import type { IFormField } from "@/types/funding-platform";
import { MetricInput } from "../MetricInput";

function TestWrapper({
  field,
  defaultValues = {},
}: {
  field: IFormField;
  defaultValues?: Record<string, unknown>;
}) {
  const { control } = useForm({ defaultValues });

  return <MetricInput field={field} control={control} fieldKey="metrics" isLoading={false} />;
}

describe("MetricInput Component", () => {
  const mockField: IFormField = {
    id: "metrics",
    type: "metric",
    label: "Impact Metrics",
    required: true,
    description: "Declare your impact metrics",
    validation: {
      minMetrics: 1,
      maxMetrics: 3,
    },
  };

  describe("Rendering", () => {
    it("renders the field label and description", () => {
      render(<TestWrapper field={mockField} />);

      expect(screen.getByText("Impact Metrics")).toBeInTheDocument();
      expect(screen.getByText("Declare your impact metrics")).toBeInTheDocument();
    });

    it("shows the required indicator when required", () => {
      render(<TestWrapper field={mockField} />);
      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("renders the add metric button initially", () => {
      render(<TestWrapper field={mockField} />);
      expect(screen.getByRole("button", { name: /add metric/i })).toBeInTheDocument();
    });
  });

  describe("Adding metrics", () => {
    it("adds a metric with all four sub-fields when clicked", () => {
      render(<TestWrapper field={mockField} />);

      fireEvent.click(screen.getByRole("button", { name: /add metric/i }));

      expect(screen.getByText("Metric 1")).toBeInTheDocument();
      expect(screen.getByLabelText(/^metric \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/data source \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/how it's measured \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/target \*/i)).toBeInTheDocument();
    });

    it("respects the maxMetrics limit", () => {
      render(<TestWrapper field={mockField} />);

      const addButton = screen.getByRole("button", { name: /add metric/i });
      for (let i = 0; i < 3; i++) {
        fireEvent.click(addButton);
      }

      expect(screen.queryByRole("button", { name: /add metric/i })).not.toBeInTheDocument();
    });
  });

  describe("Removing metrics", () => {
    it("hides the remove button at the minimum", () => {
      render(<TestWrapper field={mockField} />);

      fireEvent.click(screen.getByRole("button", { name: /add metric/i }));

      expect(screen.queryByLabelText(/remove metric/i)).not.toBeInTheDocument();
    });

    it("removes a metric when remove is clicked", () => {
      render(<TestWrapper field={mockField} />);

      const addButton = screen.getByRole("button", { name: /add metric/i });
      fireEvent.click(addButton);
      fireEvent.click(addButton);

      expect(screen.getByText("Metric 2")).toBeInTheDocument();

      fireEvent.click(screen.getAllByLabelText(/remove metric/i)[0]);

      expect(screen.queryByText("Metric 2")).not.toBeInTheDocument();
    });
  });

  describe("Validation hint", () => {
    it("pluralizes the minimum hint for minMetrics > 1", () => {
      const field = { ...mockField, validation: { minMetrics: 2, maxMetrics: 3 } };
      render(<TestWrapper field={field} />);

      expect(screen.getByText(/please add at least 2 metrics/i)).toBeInTheDocument();
    });

    it("uses the singular form for minMetrics = 1", () => {
      render(<TestWrapper field={mockField} />);

      expect(screen.getByText(/please add at least 1 metric$/i)).toBeInTheDocument();
    });
  });

  describe("Disabled state", () => {
    it("hides the add button when loading", () => {
      function LoadingWrapper() {
        const { control } = useForm();
        return (
          <MetricInput field={mockField} control={control} fieldKey="metrics" isLoading={true} />
        );
      }

      render(<LoadingWrapper />);

      expect(screen.queryByRole("button", { name: /add metric/i })).not.toBeInTheDocument();
    });
  });

  describe("Field-level error", () => {
    it("renders the array-level error message", () => {
      function ErrorWrapper() {
        const { control } = useForm();
        return (
          <MetricInput
            field={mockField}
            control={control}
            fieldKey="metrics"
            error={{ message: "At least 1 metric is required" }}
            isLoading={false}
          />
        );
      }

      render(<ErrorWrapper />);

      expect(screen.getByText("At least 1 metric is required")).toBeInTheDocument();
    });
  });
});
