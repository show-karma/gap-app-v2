import { describe, expect, it } from "vitest";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";
import { transformDataForDisplay, transformDataForSubmission } from "../form-utils";

const projectNameQuestion: ApplicationQuestion = {
  id: "field_1",
  type: "text",
  label: "1. Project Name",
  required: true,
};

const descriptionQuestion: ApplicationQuestion = {
  id: "field_2",
  type: "textarea",
  label: "2. Project Description",
  required: false,
};

const categoryQuestion: ApplicationQuestion = {
  id: "field_3",
  type: "select",
  label: "3. Category",
  required: false,
};

const checkboxQuestion: ApplicationQuestion = {
  id: "field_4",
  type: "checkbox",
  label: "4. Tags",
  required: false,
};

const questions: ApplicationQuestion[] = [
  projectNameQuestion,
  descriptionQuestion,
  categoryQuestion,
  checkboxQuestion,
];

describe("transformDataForDisplay", () => {
  it("prefills every saved answer keyed by field id, matching how applicationData is actually persisted (id-keyed, same as the read-only view)", () => {
    const applicationData = {
      field_1: "My Awesome Project",
      field_2: "A project that does things.",
      field_3: "Public Goods",
    };

    const result = transformDataForDisplay(applicationData, questions);

    expect(result.field_1).toBe("My Awesome Project");
    expect(result.field_2).toBe("A project that does things.");
    expect(result.field_3).toBe("Public Goods");
  });

  it("defaults missing text-like fields to an empty string rather than leaving them undefined", () => {
    const result = transformDataForDisplay({ field_1: "My Awesome Project" }, questions);

    expect(result.field_1).toBe("My Awesome Project");
    expect(result.field_2).toBe("");
    expect(result.field_3).toBe("");
  });

  it("resets a legacy boolean checkbox value to an empty selection array", () => {
    const result = transformDataForDisplay(
      { field_1: "My Awesome Project", field_4: true },
      questions
    );

    expect(result.field_4).toEqual([]);
  });

  it("handles an application with no saved answers at all without throwing", () => {
    const result = transformDataForDisplay({}, questions);

    expect(result.field_1).toBe("");
    expect(result.field_2).toBe("");
    expect(result.field_3).toBe("");
  });

  it("falls back to a label-keyed lookup for legacy records saved under the field label instead of the field id", () => {
    const result = transformDataForDisplay({ "1. Project Name": "Legacy Project" }, questions);

    expect(result.field_1).toBe("Legacy Project");
  });
});

describe("transformDataForSubmission", () => {
  it("submits form data keyed by field id (same shape the create flow and the read-only view expect)", () => {
    const formData = {
      field_1: "My Awesome Project",
      field_2: "A description",
    };

    const result = transformDataForSubmission(formData);

    expect(result).toEqual({
      field_1: "My Awesome Project",
      field_2: "A description",
    });
  });

  it("round-trips through display then submission without changing the persisted key shape", () => {
    const applicationData = {
      field_1: "My Awesome Project",
      field_2: "A description",
    };

    const displayed = transformDataForDisplay(applicationData, questions);
    const resubmitted = transformDataForSubmission(displayed as Record<string, unknown>);

    expect(resubmitted.field_1).toBe("My Awesome Project");
    expect(resubmitted.field_2).toBe("A description");
  });

  it("omits empty-string and undefined values from the submission payload", () => {
    const result = transformDataForSubmission({
      field_1: "My Awesome Project",
      field_2: "",
      field_3: undefined,
    });

    expect(result).toEqual({ field_1: "My Awesome Project" });
  });
});
