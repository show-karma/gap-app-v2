import { buildDynamicSchema } from "@/src/features/applications/lib/zod-schema-builder";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";

function createQuestion(
  overrides: Partial<ApplicationQuestion> & { id: string }
): ApplicationQuestion {
  return {
    type: "text",
    label: `Label ${overrides.id}`,
    required: false,
    ...overrides,
  } as ApplicationQuestion;
}

const questions: ApplicationQuestion[] = [
  createQuestion({
    id: "kind",
    type: "radio",
    required: true,
    options: [
      { value: "Individual", label: "Individual" },
      { value: "Team", label: "Team" },
    ],
  }),
  createQuestion({
    id: "team",
    required: true,
    visibleWhen: {
      combinator: "and",
      conditions: [{ fieldId: "kind", operator: "equals", value: "Team" }],
    },
  }),
];

describe("buildDynamicSchema with conditional visibility", () => {
  it("does not block validation on a hidden required field", () => {
    const schema = buildDynamicSchema(questions, { kind: "Individual" });

    const result = schema.safeParse({ kind: "Individual" });

    expect(result.success).toBe(true);
  });

  it("blocks validation when a visible conditional required field is empty", () => {
    const schema = buildDynamicSchema(questions, { kind: "Team" });

    const result = schema.safeParse({ kind: "Team", team: "" });

    expect(result.success).toBe(false);
  });

  it("accepts a filled visible conditional field", () => {
    const schema = buildDynamicSchema(questions, { kind: "Team", team: "Karma" });

    const result = schema.safeParse({ kind: "Team", team: "Karma" });

    expect(result.success).toBe(true);
  });

  it("strips hidden field values from the parsed output", () => {
    const values = { kind: "Individual", team: "Stale value" };
    const schema = buildDynamicSchema(questions, values);

    const result = schema.safeParse(values);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ kind: "Individual" });
  });

  it("validates all questions when no current values provided", () => {
    const schema = buildDynamicSchema(questions);

    const result = schema.safeParse({ kind: "Team" });

    // 'team' is required and present in the shape without visibility context
    expect(result.success).toBe(false);
  });
});
