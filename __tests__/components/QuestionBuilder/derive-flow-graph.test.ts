import {
  deriveFlowGraph,
  formatCondition,
} from "@/components/QuestionBuilder/FormFlowView/derive-flow-graph";
import type { FormField } from "@/types/question-builder";

function createField(overrides: Partial<FormField> & { id: string }): FormField {
  return {
    type: "text",
    label: `Label ${overrides.id}`,
    ...overrides,
  };
}

describe("deriveFlowGraph", () => {
  it("produces a node per field and a sequence spine for linear forms", () => {
    const fields = [createField({ id: "a" }), createField({ id: "b" }), createField({ id: "c" })];

    const { nodes, edges } = deriveFlowGraph(fields);

    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(2);
    expect(edges.every((edge) => edge.data.kind === "sequence")).toBe(true);
    expect(edges.map((edge) => [edge.source, edge.target])).toEqual([
      ["a", "b"],
      ["b", "c"],
    ]);
  });

  it("creates labeled condition edges and skips conditional fields in the spine", () => {
    const fields = [
      createField({ id: "kind", type: "radio", label: "Applying as?" }),
      createField({
        id: "team",
        label: "Team name",
        visibleWhen: {
          combinator: "and",
          conditions: [{ fieldId: "kind", operator: "equals", value: "Team" }],
        },
      }),
      createField({ id: "budget", label: "Budget" }),
    ];

    const { edges } = deriveFlowGraph(fields);

    const conditionEdges = edges.filter((edge) => edge.data.kind === "condition");
    const sequenceEdges = edges.filter((edge) => edge.data.kind === "sequence");

    expect(conditionEdges).toHaveLength(1);
    expect(conditionEdges[0]).toMatchObject({
      source: "kind",
      target: "team",
      label: 'is "Team"',
    });
    // Spine connects kind -> budget directly, bypassing the conditional field
    expect(sequenceEdges).toHaveLength(1);
    expect(sequenceEdges[0]).toMatchObject({ source: "kind", target: "budget" });
  });

  it("creates one edge per condition for AND groups", () => {
    const fields = [
      createField({ id: "a" }),
      createField({ id: "b" }),
      createField({
        id: "c",
        visibleWhen: {
          combinator: "and",
          conditions: [
            { fieldId: "a", operator: "answered" },
            { fieldId: "b", operator: "answered" },
          ],
        },
      }),
    ];

    const { edges } = deriveFlowGraph(fields);
    const conditionEdges = edges.filter((edge) => edge.data.kind === "condition");

    expect(conditionEdges).toHaveLength(2);
    expect(conditionEdges.map((edge) => edge.source).sort()).toEqual(["a", "b"]);
    expect(conditionEdges.every((edge) => edge.data.combinator === "and")).toBe(true);
  });

  it("skips condition edges whose source field no longer exists", () => {
    const fields = [
      createField({
        id: "b",
        visibleWhen: {
          combinator: "and",
          conditions: [{ fieldId: "ghost", operator: "answered" }],
        },
      }),
    ];

    const { edges } = deriveFlowGraph(fields);

    expect(edges).toHaveLength(0);
  });

  it("marks conditional and section header nodes in node data", () => {
    const fields = [
      createField({ id: "header", type: "section_header" }),
      createField({ id: "a", required: true }),
      createField({
        id: "b",
        visibleWhen: {
          combinator: "and",
          conditions: [{ fieldId: "a", operator: "answered" }],
        },
      }),
    ];

    const { nodes } = deriveFlowGraph(fields);

    expect(nodes[0].data.isSectionHeader).toBe(true);
    expect(nodes[1].data.required).toBe(true);
    expect(nodes[1].data.conditional).toBe(false);
    expect(nodes[2].data.conditional).toBe(true);
  });
});

describe("formatCondition", () => {
  it("formats valueless operators without quotes", () => {
    expect(formatCondition({ fieldId: "a", operator: "answered" })).toBe("is answered");
  });

  it("formats array values as a comma list", () => {
    expect(
      formatCondition({ fieldId: "a", operator: "includes_any", value: ["Docs", "Code"] })
    ).toBe('includes any of "Docs, Code"');
  });

  it("truncates long values", () => {
    const longValue = "An exceptionally long option label that keeps going";

    const formatted = formatCondition({ fieldId: "a", operator: "equals", value: longValue });

    expect(formatted.length).toBeLessThan(longValue.length + 10);
    expect(formatted).toContain("…");
  });
});
