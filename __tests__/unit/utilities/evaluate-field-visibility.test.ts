import type { FieldConditionGroup, FormField } from "@/types/question-builder";
import {
  type ConditionalFieldLike,
  evaluateVisibleFields,
  getConditionSourceIds,
  getDependentFields,
  isAnswered,
  isFieldOrderValid,
  validateConditionIntegrity,
} from "@/utilities/form-visibility/evaluate-field-visibility";

function createField(overrides: Partial<FormField> & { id: string }): FormField {
  return {
    type: "text",
    label: `Label ${overrides.id}`,
    ...overrides,
  };
}

function visibleWhen(
  conditions: FieldConditionGroup["conditions"],
  combinator: FieldConditionGroup["combinator"] = "and"
): FieldConditionGroup {
  return { combinator, conditions };
}

function evaluate(fields: ConditionalFieldLike[], values: Record<string, unknown>) {
  return evaluateVisibleFields(fields, (field) => values[field.id]);
}

describe("evaluateVisibleFields", () => {
  it("treats fields without conditions as visible", () => {
    const fields = [createField({ id: "a" })];

    expect(evaluate(fields, {}).has("a")).toBe(true);
  });

  it("hides field when equals condition not met and shows when met", () => {
    const fields = [
      createField({ id: "kind", type: "radio" }),
      createField({
        id: "team",
        visibleWhen: visibleWhen([{ fieldId: "kind", operator: "equals", value: "Team" }]),
      }),
    ];

    expect(evaluate(fields, { kind: "Individual" }).has("team")).toBe(false);
    expect(evaluate(fields, { kind: "Team" }).has("team")).toBe(true);
  });

  it("cascades hiding when the source field is itself hidden", () => {
    const fields = [
      createField({ id: "a", type: "radio" }),
      createField({
        id: "b",
        type: "radio",
        visibleWhen: visibleWhen([{ fieldId: "a", operator: "equals", value: "yes" }]),
      }),
      createField({
        id: "c",
        visibleWhen: visibleWhen([{ fieldId: "b", operator: "equals", value: "yes" }]),
      }),
    ];

    const visible = evaluate(fields, { a: "no", b: "yes" });

    expect(visible.has("b")).toBe(false);
    expect(visible.has("c")).toBe(false);
  });

  it("combines conditions with AND and OR", () => {
    const andField = createField({
      id: "c",
      visibleWhen: visibleWhen([
        { fieldId: "a", operator: "equals", value: "1" },
        { fieldId: "b", operator: "equals", value: "2" },
      ]),
    });
    const orField = createField({
      id: "c",
      visibleWhen: visibleWhen(
        [
          { fieldId: "a", operator: "equals", value: "1" },
          { fieldId: "b", operator: "equals", value: "2" },
        ],
        "or"
      ),
    });
    const base = [createField({ id: "a" }), createField({ id: "b" })];

    expect(evaluate([...base, andField], { a: "1", b: "nope" }).has("c")).toBe(false);
    expect(evaluate([...base, andField], { a: "1", b: "2" }).has("c")).toBe(true);
    expect(evaluate([...base, orField], { a: "nope", b: "2" }).has("c")).toBe(true);
  });

  it("treats conditions on missing sources as not satisfied", () => {
    const fields = [
      createField({
        id: "b",
        visibleWhen: visibleWhen([{ fieldId: "ghost", operator: "answered" }]),
      }),
    ];

    expect(evaluate(fields, { ghost: "value" }).has("b")).toBe(false);
  });

  it("fails closed on unknown operators without throwing", () => {
    const fields = [
      createField({ id: "a" }),
      createField({
        id: "b",
        visibleWhen: {
          combinator: "and",
          conditions: [{ fieldId: "a", operator: "matches_regex" as never, value: ".*" }],
        },
      }),
    ];

    expect(evaluate(fields, { a: "anything" }).has("b")).toBe(false);
  });

  it.each([
    ["in", ["Team", "DAO"], "DAO", true],
    ["in", ["Team", "DAO"], "Individual", false],
    ["includes_any", ["Docs", "Code"], ["Code", "Design"], true],
    ["includes_any", ["Docs", "Code"], ["Design"], false],
    ["includes_all", ["Docs", "Code"], ["Docs", "Code", "More"], true],
    ["includes_all", ["Docs", "Code"], ["Docs"], false],
  ] as const)(
    "evaluates %s with %p against %p as %p",
    (operator, conditionValue, answer, expected) => {
      const fields = [
        createField({ id: "a", type: "checkbox" }),
        createField({
          id: "b",
          visibleWhen: visibleWhen([{ fieldId: "a", operator, value: conditionValue as string[] }]),
        }),
      ];

      expect(evaluate(fields, { a: answer }).has("b")).toBe(expected);
    }
  );

  it("evaluates includes_any against checkbox object-map answers", () => {
    const fields = [
      createField({ id: "a", type: "checkbox" }),
      createField({
        id: "b",
        visibleWhen: visibleWhen([{ fieldId: "a", operator: "includes_any", value: ["Code"] }]),
      }),
    ];

    expect(evaluate(fields, { a: { Code: true, Docs: false } }).has("b")).toBe(true);
  });

  it.each([
    ["gt", "5", 10, true],
    ["gt", "5", 5, false],
    ["gte", "5", 5, true],
    ["lt", "5", 4, true],
    ["lte", "5", 6, false],
  ] as const)(
    "evaluates %s threshold %p against %p as %p",
    (operator, conditionValue, answer, expected) => {
      const fields = [
        createField({ id: "a", type: "number" }),
        createField({
          id: "b",
          visibleWhen: visibleWhen([{ fieldId: "a", operator, value: conditionValue }]),
        }),
      ];

      expect(evaluate(fields, { a: answer }).has("b")).toBe(expected);
    }
  );

  it("compares dates for ordered operators", () => {
    const fields = [
      createField({ id: "a", type: "date" }),
      createField({
        id: "b",
        visibleWhen: visibleWhen([{ fieldId: "a", operator: "gte", value: "2024-01-01" }]),
      }),
    ];

    expect(evaluate(fields, { a: "2024-06-15" }).has("b")).toBe(true);
    expect(evaluate(fields, { a: "2023-12-31" }).has("b")).toBe(false);
  });

  it("evaluates contains case-insensitively", () => {
    const fields = [
      createField({ id: "a" }),
      createField({
        id: "b",
        visibleWhen: visibleWhen([{ fieldId: "a", operator: "contains", value: "OPEN source" }]),
      }),
    ];

    expect(evaluate(fields, { a: "We build open SOURCE tooling" }).has("b")).toBe(true);
  });
});

describe("isAnswered", () => {
  it.each([
    [undefined, false],
    [null, false],
    ["", false],
    ["   ", false],
    ["text", true],
    [0, true],
    [Number.NaN, false],
    [true, true],
    [false, false],
    [[], false],
    [["a"], true],
    [{}, false],
    [{ a: false, b: false }, false],
    [{ a: true }, true],
  ])("returns isAnswered(%p) === %p", (value, expected) => {
    expect(isAnswered(value)).toBe(expected);
  });
});

describe("getConditionSourceIds", () => {
  it("collects unique referenced field ids", () => {
    const fields = [
      createField({ id: "a" }),
      createField({ id: "b" }),
      createField({
        id: "c",
        visibleWhen: visibleWhen([
          { fieldId: "a", operator: "answered" },
          { fieldId: "b", operator: "answered" },
        ]),
      }),
      createField({
        id: "d",
        visibleWhen: visibleWhen([{ fieldId: "a", operator: "answered" }]),
      }),
    ];

    expect(getConditionSourceIds(fields).sort()).toEqual(["a", "b"]);
  });

  it("returns empty array for forms without conditions", () => {
    expect(getConditionSourceIds([createField({ id: "a" })])).toEqual([]);
  });
});

describe("getDependentFields", () => {
  it("returns fields whose conditions reference the given field", () => {
    const dependent = createField({
      id: "b",
      visibleWhen: visibleWhen([{ fieldId: "a", operator: "answered" }]),
    });
    const fields = [createField({ id: "a" }), dependent, createField({ id: "c" })];

    expect(getDependentFields(fields, "a")).toEqual([dependent]);
    expect(getDependentFields(fields, "c")).toEqual([]);
  });
});

describe("isFieldOrderValid", () => {
  it("accepts conditions referencing earlier fields", () => {
    const fields = [
      createField({ id: "a" }),
      createField({
        id: "b",
        visibleWhen: visibleWhen([{ fieldId: "a", operator: "answered" }]),
      }),
    ];

    expect(isFieldOrderValid(fields)).toBe(true);
  });

  it("rejects orders where a dependent precedes its source", () => {
    const fields = [
      createField({
        id: "b",
        visibleWhen: visibleWhen([{ fieldId: "a", operator: "answered" }]),
      }),
      createField({ id: "a" }),
    ];

    expect(isFieldOrderValid(fields)).toBe(false);
  });
});

describe("validateConditionIntegrity", () => {
  it("accepts valid chained conditions", () => {
    const fields = [
      createField({ id: "a", type: "radio", options: ["Yes", "No"] }),
      createField({
        id: "b",
        type: "select",
        options: ["1", "2"],
        visibleWhen: visibleWhen([{ fieldId: "a", operator: "equals", value: "Yes" }]),
      }),
      createField({
        id: "c",
        visibleWhen: visibleWhen([{ fieldId: "b", operator: "in", value: ["1", "2"] }]),
      }),
    ];

    expect(validateConditionIntegrity(fields)).toEqual([]);
  });

  it("rejects dangling references", () => {
    const fields = [
      createField({
        id: "b",
        visibleWhen: visibleWhen([{ fieldId: "ghost", operator: "answered" }]),
      }),
    ];

    const errors = validateConditionIntegrity(fields);

    expect(errors).toHaveLength(1);
    expect(errors[0].fieldId).toBe("b");
    expect(errors[0].message).toContain("no longer exists");
  });

  it("rejects forward and self references", () => {
    const forward = validateConditionIntegrity([
      createField({
        id: "b",
        visibleWhen: visibleWhen([{ fieldId: "a", operator: "answered" }]),
      }),
      createField({ id: "a" }),
    ]);
    const self = validateConditionIntegrity([
      createField({ id: "a" }),
      createField({
        id: "b",
        visibleWhen: visibleWhen([{ fieldId: "b", operator: "answered" }]),
      }),
    ]);

    expect(forward[0].message).toContain("earlier in the form");
    expect(self[0].message).toContain("earlier in the form");
  });

  it("rejects operators incompatible with the source type", () => {
    const errors = validateConditionIntegrity([
      createField({ id: "a", type: "text" }),
      createField({
        id: "b",
        visibleWhen: visibleWhen([{ fieldId: "a", operator: "includes_any", value: ["x"] }]),
      }),
    ]);

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("is not valid for");
  });

  it("rejects condition values that are not options of the source", () => {
    const errors = validateConditionIntegrity([
      createField({ id: "a", type: "select", options: ["Yes", "No"] }),
      createField({
        id: "b",
        visibleWhen: visibleWhen([{ fieldId: "a", operator: "equals", value: "Maybe" }]),
      }),
    ]);

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("no longer an option");
  });

  it("rejects missing comparison values", () => {
    const errors = validateConditionIntegrity([
      createField({ id: "a" }),
      createField({
        id: "b",
        visibleWhen: visibleWhen([{ fieldId: "a", operator: "equals" }]),
      }),
    ]);

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("missing a comparison value");
  });

  it("rejects conditional email fields", () => {
    const errors = validateConditionIntegrity([
      createField({ id: "a" }),
      createField({
        id: "b",
        type: "email",
        visibleWhen: visibleWhen([{ fieldId: "a", operator: "answered" }]),
      }),
    ]);

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("email fields cannot be conditional");
  });

  it.each(["section_header", "milestone", "karma_profile_link"])(
    "rejects %s as a condition source",
    (sourceType) => {
      const errors = validateConditionIntegrity([
        createField({ id: "a", type: sourceType as FormField["type"] }),
        createField({
          id: "b",
          visibleWhen: visibleWhen([{ fieldId: "a", operator: "answered" }]),
        }),
      ]);

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("cannot be used as a condition source");
    }
  );
});
