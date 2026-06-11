import { fireEvent, render, screen } from "@testing-library/react";
import { ConditionalLogicEditor } from "@/components/QuestionBuilder/ConditionalLogicEditor";
import type { FormField } from "@/types/question-builder";

function createField(overrides: Partial<FormField> & { id: string }): FormField {
  return {
    type: "text",
    label: `Label ${overrides.id}`,
    ...overrides,
  };
}

const sourceRadio = createField({
  id: "kind",
  type: "radio",
  label: "Applying as?",
  options: ["Individual", "Team"],
});

describe("ConditionalLogicEditor", () => {
  const onUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("empty state", () => {
    it("explains that an earlier answerable question is needed", () => {
      const field = createField({ id: "first" });

      render(<ConditionalLogicEditor field={field} allFields={[field]} onUpdate={onUpdate} />);

      expect(screen.getByText(/add an answerable question/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/show this question conditionally/i)).not.toBeInTheDocument();
    });

    it("excludes section headers and milestones from eligible sources", () => {
      const header = createField({ id: "header", type: "section_header" });
      const milestone = createField({ id: "ms", type: "milestone" });
      const field = createField({ id: "target" });

      render(
        <ConditionalLogicEditor
          field={field}
          allFields={[header, milestone, field]}
          onUpdate={onUpdate}
        />
      );

      expect(screen.getByText(/add an answerable question/i)).toBeInTheDocument();
    });
  });

  describe("enabling conditions", () => {
    it("seeds an equals condition on the first option for choice sources", () => {
      const field = createField({ id: "team", label: "Team name" });

      render(
        <ConditionalLogicEditor
          field={field}
          allFields={[sourceRadio, field]}
          onUpdate={onUpdate}
        />
      );
      fireEvent.click(screen.getByLabelText(/show this question conditionally/i));

      expect(onUpdate).toHaveBeenCalledWith({
        ...field,
        visibleWhen: {
          combinator: "and",
          conditions: [{ fieldId: "kind", operator: "equals", value: "Individual" }],
        },
      });
    });

    it("removes visibleWhen when toggled off", () => {
      const field = createField({
        id: "team",
        visibleWhen: {
          combinator: "and",
          conditions: [{ fieldId: "kind", operator: "equals", value: "Team" }],
        },
      });

      render(
        <ConditionalLogicEditor
          field={field}
          allFields={[sourceRadio, field]}
          onUpdate={onUpdate}
        />
      );
      fireEvent.click(screen.getByLabelText(/show this question conditionally/i));

      expect(onUpdate).toHaveBeenCalledWith({ ...field, visibleWhen: undefined });
    });
  });

  describe("condition rows", () => {
    const conditionalField = createField({
      id: "team",
      label: "Team name",
      visibleWhen: {
        combinator: "and",
        conditions: [{ fieldId: "kind", operator: "equals", value: "Team" }],
      },
    });

    it("only offers earlier value-bearing fields as sources", () => {
      const later = createField({ id: "later", type: "select", options: ["x"] });

      render(
        <ConditionalLogicEditor
          field={conditionalField}
          allFields={[sourceRadio, conditionalField, later]}
          onUpdate={onUpdate}
        />
      );

      const sourceSelect = screen.getByLabelText("Condition question");
      const optionLabels = Array.from(sourceSelect.querySelectorAll("option")).map(
        (option) => option.textContent
      );
      expect(optionLabels).toContain("Applying as?");
      expect(optionLabels).not.toContain("Label later");
    });

    it("offers operators matching the source field type", () => {
      render(
        <ConditionalLogicEditor
          field={conditionalField}
          allFields={[sourceRadio, conditionalField]}
          onUpdate={onUpdate}
        />
      );

      const operatorSelect = screen.getByLabelText("Condition operator");
      const operatorValues = Array.from(operatorSelect.querySelectorAll("option")).map((option) =>
        option.getAttribute("value")
      );
      expect(operatorValues).toEqual(
        expect.arrayContaining(["answered", "not_answered", "equals", "not_equals", "in"])
      );
      expect(operatorValues).not.toContain("includes_any");
    });

    it("updates the condition value from the option dropdown", () => {
      render(
        <ConditionalLogicEditor
          field={conditionalField}
          allFields={[sourceRadio, conditionalField]}
          onUpdate={onUpdate}
        />
      );

      fireEvent.change(screen.getByLabelText("Condition value"), {
        target: { value: "Individual" },
      });

      expect(onUpdate).toHaveBeenCalledWith({
        ...conditionalField,
        visibleWhen: {
          combinator: "and",
          conditions: [{ fieldId: "kind", operator: "equals", value: "Individual" }],
        },
      });
    });

    it("clears the value when switching to a valueless operator", () => {
      render(
        <ConditionalLogicEditor
          field={conditionalField}
          allFields={[sourceRadio, conditionalField]}
          onUpdate={onUpdate}
        />
      );

      fireEvent.change(screen.getByLabelText("Condition operator"), {
        target: { value: "answered" },
      });

      expect(onUpdate).toHaveBeenCalledWith({
        ...conditionalField,
        visibleWhen: {
          combinator: "and",
          conditions: [{ fieldId: "kind", operator: "answered", value: undefined }],
        },
      });
    });

    it("removes the group entirely when the last condition row is deleted", () => {
      render(
        <ConditionalLogicEditor
          field={conditionalField}
          allFields={[sourceRadio, conditionalField]}
          onUpdate={onUpdate}
        />
      );

      fireEvent.click(screen.getByLabelText("Remove condition"));

      expect(onUpdate).toHaveBeenCalledWith({
        ...conditionalField,
        visibleWhen: undefined,
      });
    });

    it("flags condition values that are no longer options", () => {
      const stale = createField({
        id: "team",
        visibleWhen: {
          combinator: "and",
          conditions: [{ fieldId: "kind", operator: "equals", value: "Removed option" }],
        },
      });

      render(
        <ConditionalLogicEditor
          field={stale}
          allFields={[sourceRadio, stale]}
          onUpdate={onUpdate}
        />
      );

      expect(screen.getByText(/no longer an option/i)).toBeInTheDocument();
    });
  });

  describe("read-only mode", () => {
    it("disables all controls", () => {
      const field = createField({
        id: "team",
        visibleWhen: {
          combinator: "and",
          conditions: [{ fieldId: "kind", operator: "equals", value: "Team" }],
        },
      });

      render(
        <ConditionalLogicEditor
          field={field}
          allFields={[sourceRadio, field]}
          onUpdate={onUpdate}
          readOnly
        />
      );

      expect(screen.getByLabelText(/show this question conditionally/i)).toBeDisabled();
      expect(screen.getByLabelText("Condition question")).toBeDisabled();
      expect(screen.getByLabelText("Condition operator")).toBeDisabled();
      expect(screen.queryByLabelText("Remove condition")).not.toBeInTheDocument();
    });
  });
});
