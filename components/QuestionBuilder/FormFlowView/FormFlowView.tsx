"use client";

import dagre from "@dagrejs/dagre";
import {
  Background,
  Controls,
  type Edge,
  Handle,
  MiniMap,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
} from "@xyflow/react";
import { useTheme } from "next-themes";
import React, { useMemo } from "react";
import type { FormField } from "@/types/question-builder";
import { fieldTypes } from "../FieldTypeSelector";
import { deriveFlowGraph, type FlowNodeData } from "./derive-flow-graph";

import "@xyflow/react/dist/style.css";

const NODE_WIDTH = 230;
const NODE_HEIGHT = 70;

interface FormFlowViewProps {
  fields: FormField[];
  onNodeSelect?: (fieldId: string) => void;
}

type FormFieldNode = Node<FlowNodeData, "formField">;

const FormFieldNodeComponent = React.memo(function FormFieldNodeComponent({
  data,
}: NodeProps<FormFieldNode>) {
  const typeLabel =
    fieldTypes.find((item) => item.type === data.fieldType)?.label || data.fieldType;

  return (
    <div
      className={`w-[230px] rounded-lg border px-3 py-2 text-left shadow-sm cursor-pointer transition-colors ${
        data.isSectionHeader
          ? "border-dashed border-gray-400 bg-gray-50 dark:bg-zinc-900 dark:border-zinc-600"
          : data.conditional
            ? "border-blue-400 bg-blue-50/60 hover:border-blue-500 dark:bg-blue-900/20 dark:border-blue-700"
            : "border-gray-200 bg-white hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
          {typeLabel}
        </span>
        {data.required && <span className="text-[10px] text-red-500">Required</span>}
        {data.conditional && (
          <span className="text-[10px] text-blue-600 dark:text-blue-400">Conditional</span>
        )}
      </div>
      <p className="mt-1 text-xs font-medium text-gray-900 dark:text-white truncate">
        {data.label}
      </p>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
});

const nodeTypes = { formField: FormFieldNodeComponent };

function layoutWithDagre(nodes: Node[], edges: Edge[]): Node[] {
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "TB", nodesep: 48, ranksep: 64 });

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  return nodes.map((node) => {
    const { x, y } = graph.node(node.id);
    return {
      ...node,
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
    };
  });
}

export default function FormFlowView({ fields, onNodeSelect }: FormFlowViewProps) {
  const { resolvedTheme } = useTheme();

  const hasConditions = useMemo(
    () => fields.some((field) => field.visibleWhen?.conditions?.length),
    [fields]
  );

  const { nodes, edges } = useMemo(() => {
    const graph = deriveFlowGraph(fields);

    const flowEdges: Edge[] = graph.edges.map((edge) => {
      const isCondition = edge.data.kind === "condition";
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        style: isCondition
          ? { stroke: "rgb(var(--color-primary-dark))", strokeWidth: 1.5 }
          : { strokeOpacity: 0.35 },
        labelStyle: { fontSize: 10 },
        animated: false,
      };
    });

    return { nodes: layoutWithDagre(graph.nodes, flowEdges), edges: flowEdges };
  }, [fields]);

  return (
    <div
      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      style={{ height: Math.min(720, 320 + fields.length * 36) }}
      data-testid="form-flow-view"
    >
      {!hasConditions && (
        <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
          No conditional logic yet — open a question&apos;s settings and enable &quot;Show this
          question conditionally&quot; to create branches.
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => onNodeSelect?.(node.id)}
        minZoom={0.2}
      >
        <Background gap={16} />
        <Controls showInteractive={false} />
        {fields.length > 12 && <MiniMap pannable zoomable />}
      </ReactFlow>
    </div>
  );
}
