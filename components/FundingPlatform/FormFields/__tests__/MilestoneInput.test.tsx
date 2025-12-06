/**
 * Tests for MilestoneInput Component
 *
 * These tests verify that the MilestoneInput component properly handles
 * milestone field arrays with all five fields including the new optional fields:
 * fundingRequested and completionCriteria
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import type { IFormField, IMilestoneData } from "@/types/funding-platform";
import { MilestoneInput } from "../MilestoneInput";

// Wrapper component to provide form context
function TestWrapper({ field, defaultValues = {} }: { field: IFormField; defaultValues?: any }) {
  const { control } = useForm({
    defaultValues,
  });

  return <MilestoneInput field={field} control={control} fieldKey="milestones" isLoading={false} />;
}

describe("MilestoneInput Component", () => {
  const mockField: IFormField = {
    id: "milestones",
    type: "milestone",
    label: "Project Milestones",
    required: true,
    description: "Add project milestones",
    validation: {
      minMilestones: 1,
      maxMilestones: 5,
    },
  };

  describe("Rendering", () => {
    it("should render the field label and description", () => {
      render(<TestWrapper field={mockField} />);

      expect(screen.getByText("Project Milestones")).toBeInTheDocument();
      expect(screen.getByText("Add project milestones")).toBeInTheDocument();
    });

    it("should show required indicator when field is required", () => {
      render(<TestWrapper field={mockField} />);

      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("should not show required indicator when field is optional", () => {
      const optionalField = { ...mockField, required: false };
      render(<TestWrapper field={optionalField} />);

      expect(screen.queryByText("*")).not.toBeInTheDocument();
    });

    it("should render add milestone button initially", () => {
      render(<TestWrapper field={mockField} />);

      expect(screen.getByRole("button", { name: /add milestone/i })).toBeInTheDocument();
    });
  });

  describe("Adding Milestones", () => {
    it("should add a milestone when add button is clicked", () => {
      render(<TestWrapper field={mockField} />);

      const addButton = screen.getByRole("button", { name: /add milestone/i });
      fireEvent.click(addButton);

      expect(screen.getByText("Milestone 1")).toBeInTheDocument();
    });

    it("should add multiple milestones", () => {
      render(<TestWrapper field={mockField} />);

      const addButton = screen.getByRole("button", { name: /add milestone/i });

      fireEvent.click(addButton);
      fireEvent.click(addButton);
      fireEvent.click(addButton);

      expect(screen.getByText("Milestone 1")).toBeInTheDocument();
      expect(screen.getByText("Milestone 2")).toBeInTheDocument();
      expect(screen.getByText("Milestone 3")).toBeInTheDocument();
    });

    it("should respect maxMilestones limit", () => {
      render(<TestWrapper field={mockField} />);

      const addButton = screen.getByRole("button", { name: /add milestone/i });

      // Add 5 milestones (the max)
      for (let i = 0; i < 5; i++) {
        fireEvent.click(addButton);
      }

      // Button should no longer be visible
      expect(screen.queryByRole("button", { name: /add milestone/i })).not.toBeInTheDocument();
    });
  });

  describe("Milestone Fields", () => {
    it("should render all required fields for each milestone", () => {
      render(<TestWrapper field={mockField} />);

      const addButton = screen.getByRole("button", { name: /add milestone/i });
      fireEvent.click(addButton);

      expect(screen.getByLabelText(/title \*/i)).toBeInTheDocument();
      // Description is a MarkdownEditor, check for label text instead
      expect(screen.getByText(/description \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/due date \*/i)).toBeInTheDocument();
    });

    it("should render new optional fields", () => {
      render(<TestWrapper field={mockField} />);

      const addButton = screen.getByRole("button", { name: /add milestone/i });
      fireEvent.click(addButton);

      expect(screen.getByLabelText(/funding requested \(optional\)/i)).toBeInTheDocument();
      // MarkdownEditor doesn't have proper label association, check for label text
      expect(screen.getByText(/completion criteria \(optional\)/i)).toBeInTheDocument();
    });

    it("should accept text input for funding requested field", () => {
      render(<TestWrapper field={mockField} />);

      const addButton = screen.getByRole("button", { name: /add milestone/i });
      fireEvent.click(addButton);

      const fundingInput = screen.getByLabelText(/funding requested \(optional\)/i);
      fireEvent.change(fundingInput, { target: { value: "$5,000 USD" } });

      expect(fundingInput).toHaveValue("$5,000 USD");
    });

    it("should accept various funding request formats", () => {
      render(<TestWrapper field={mockField} />);

      const addButton = screen.getByRole("button", { name: /add milestone/i });
      fireEvent.click(addButton);

      const fundingInput = screen.getByLabelText(/funding requested \(optional\)/i);

      const formats = ["$5,000", "5000", "5000 USD", "€5,000"];

      formats.forEach((format) => {
        fireEvent.change(fundingInput, { target: { value: format } });
        expect(fundingInput).toHaveValue(format);
      });
    });
  });

  describe("Removing Milestones", () => {
    it("should show remove button when above minimum", () => {
      const field = { ...mockField, validation: { minMilestones: 1, maxMilestones: 5 } };
      render(<TestWrapper field={field} />);

      const addButton = screen.getByRole("button", { name: /add milestone/i });
      fireEvent.click(addButton);
      fireEvent.click(addButton); // Add 2 milestones

      const removeButtons = screen.getAllByLabelText(/remove milestone/i);
      expect(removeButtons).toHaveLength(2);
    });

    it("should not show remove button when at minimum", () => {
      const field = { ...mockField, validation: { minMilestones: 1, maxMilestones: 5 } };
      render(<TestWrapper field={field} />);

      const addButton = screen.getByRole("button", { name: /add milestone/i });
      fireEvent.click(addButton);

      expect(screen.queryByLabelText(/remove milestone/i)).not.toBeInTheDocument();
    });

    it("should remove milestone when remove button is clicked", () => {
      render(<TestWrapper field={mockField} />);

      const addButton = screen.getByRole("button", { name: /add milestone/i });
      fireEvent.click(addButton);
      fireEvent.click(addButton);

      expect(screen.getByText("Milestone 1")).toBeInTheDocument();
      expect(screen.getByText("Milestone 2")).toBeInTheDocument();

      const removeButtons = screen.getAllByLabelText(/remove milestone/i);
      fireEvent.click(removeButtons[0]);

      expect(screen.queryByText("Milestone 2")).not.toBeInTheDocument();
    });
  });

  describe("Validation Hints", () => {
    it("should show minimum milestones hint when below minimum", () => {
      const field = { ...mockField, validation: { minMilestones: 2, maxMilestones: 5 } };
      render(<TestWrapper field={field} />);

      expect(screen.getByText(/please add at least 2 milestones/i)).toBeInTheDocument();
    });

    it("should show single milestone hint for minMilestones = 1", () => {
      const field = { ...mockField, validation: { minMilestones: 1, maxMilestones: 5 } };
      render(<TestWrapper field={field} />);

      expect(screen.getByText(/please add at least 1 milestone$/i)).toBeInTheDocument();
    });

    it("should hide hint when minimum is met", () => {
      const field = { ...mockField, validation: { minMilestones: 1, maxMilestones: 5 } };
      render(<TestWrapper field={field} />);

      const addButton = screen.getByRole("button", { name: /add milestone/i });
      fireEvent.click(addButton);

      expect(screen.queryByText(/please add at least 1 milestone/i)).not.toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    function DisabledTestWrapper({ field }: { field: IFormField }) {
      const { control } = useForm();

      return (
        <MilestoneInput field={field} control={control} fieldKey="milestones" isLoading={true} />
      );
    }

    it("should disable add button when loading", () => {
      render(<DisabledTestWrapper field={mockField} />);

      expect(screen.queryByRole("button", { name: /add milestone/i })).not.toBeInTheDocument();
    });

    it("should disable remove buttons when loading", () => {
      const defaultValues = {
        milestones: [
          {
            title: "Test",
            description: "Test",
            dueDate: "2024-12-31",
            fundingRequested: "",
            completionCriteria: "",
          },
        ],
      };

      function LoadingTestWrapper() {
        const { control } = useForm({ defaultValues });
        return (
          <MilestoneInput
            field={mockField}
            control={control}
            fieldKey="milestones"
            isLoading={true}
          />
        );
      }

      render(<LoadingTestWrapper />);

      expect(screen.queryByLabelText(/remove milestone/i)).not.toBeInTheDocument();
    });
  });

  describe("Backward Compatibility", () => {
    it("should handle milestones without optional fields", () => {
      const oldMilestone = {
        title: "Old Milestone",
        description: "Old description",
        dueDate: "2024-06-15",
      };

      const defaultValues = {
        milestones: [oldMilestone],
      };

      render(<TestWrapper field={mockField} defaultValues={defaultValues} />);

      expect(screen.getByText("Milestone 1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Old Milestone")).toBeInTheDocument();
    });

    it("should allow optional fields to be empty", () => {
      render(<TestWrapper field={mockField} />);

      const addButton = screen.getByRole("button", { name: /add milestone/i });
      fireEvent.click(addButton);

      const fundingInput = screen.getByLabelText(/funding requested \(optional\)/i);
      expect(fundingInput).toHaveValue("");

      // MarkdownEditor doesn't have proper label association, just verify label exists
      expect(screen.getByText(/completion criteria \(optional\)/i)).toBeInTheDocument();
    });
  });

  describe("Integration with Form Validation", () => {
    it("should show field-level error when provided", () => {
      const error = { message: "At least 1 milestone is required" };

      function ErrorTestWrapper() {
        const { control } = useForm();
        return (
          <MilestoneInput
            field={mockField}
            control={control}
            fieldKey="milestones"
            error={error}
            isLoading={false}
          />
        );
      }

      render(<ErrorTestWrapper />);

      expect(screen.getByText("At least 1 milestone is required")).toBeInTheDocument();
    });
  });
});
