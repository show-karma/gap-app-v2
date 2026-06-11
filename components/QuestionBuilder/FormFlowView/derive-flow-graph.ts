import type { FieldCondition, FormField } from "@/types/question-builder";
import { OPERATOR_LABELS } from "@/utilities/form-visibility/evaluate-field-visibility";

const MAX_LABEL_VALUE_LENGTH = 24;

export interface FlowNodeData {
  label: string;
  fieldType: FormField["type"];
  required: boolean;
  conditional: boolean;
  isSectionHeader: boolean;
  [key: string]: unknown;
}

export interface FlowNode {
  id: string;
  type: "formField";
  position: { x: number; y: number };
  data: FlowNodeData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  data: { kind: "condition" | "sequence"; combinator?: "and" | "or" };
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

function truncate(value: string): string {
  if (value.length <= MAX_LABEL_VALUE_LENGTH) return value;
  return `${value.slice(0, MAX_LABEL_VALUE_LENGTH)}…`;
}

export function formatCondition(condition: FieldCondition): string {
  const operatorLabel = OPERATOR_LABELS[condition.operator] ?? condition.operator;
  if (condition.value === undefined || condition.value === null) {
    return operatorLabel;
  }
  const value = Array.isArray(condition.value)
    ? condition.value.join(", ")
    : String(condition.value);
  return `${operatorLabel} "${truncate(value)}"`;
}

/**
 * Derives a React Flow graph from the form definition.
 *
 * - One node per field, in form order.
 * - A faint "sequence" edge chains consecutive ALWAYS-VISIBLE fields so the
 *   unconditional flow reads top to bottom.
 * - One labeled "condition" edge per condition (source field -> dependent),
 *   so every branch is visible at a glance.
 *
 * Positions are zeroed here — the FormFlowView lays the graph out with dagre.
 */
export function deriveFlowGraph(fields: readonly FormField[]): FlowGraph {
  const nodes: FlowNode[] = fields.map((field) => ({
    id: field.id,
    type: "formField",
    position: { x: 0, y: 0 },
    data: {
      label: field.label || "Untitled question",
      fieldType: field.type,
      required: !!field.required,
      conditional: !!field.visibleWhen?.conditions?.length,
      isSectionHeader: field.type === "section_header",
    },
  }));

  const edges: FlowEdge[] = [];

  // Spine: consecutive always-visible fields in form order
  let previousAlwaysVisibleId: string | null = null;
  for (const field of fields) {
    if (field.visibleWhen?.conditions?.length) continue;
    if (previousAlwaysVisibleId) {
      edges.push({
        id: `seq-${previousAlwaysVisibleId}-${field.id}`,
        source: previousAlwaysVisibleId,
        target: field.id,
        data: { kind: "sequence" },
      });
    }
    previousAlwaysVisibleId = field.id;
  }

  // Branches: one edge per condition
  const fieldIds = new Set(fields.map((field) => field.id));
  for (const field of fields) {
    const group = field.visibleWhen;
    if (!group?.conditions?.length) continue;
    group.conditions.forEach((condition, index) => {
      if (!fieldIds.has(condition.fieldId)) return;
      edges.push({
        id: `cond-${condition.fieldId}-${field.id}-${index}`,
        source: condition.fieldId,
        target: field.id,
        label: formatCondition(condition),
        data: { kind: "condition", combinator: group.combinator },
      });
    });
  }

  return { nodes, edges };
}
