"use client";

import dynamic from "next/dynamic";

// React Flow + dagre are heavy — load them only when the operator opens the
// Flow view (and never on the server).
export const FormFlowView = dynamic(() => import("./FormFlowView"), {
  ssr: false,
  loading: () => (
    <output
      className="flex h-[420px] w-full animate-pulse items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
      aria-label="Loading flow view"
    >
      <span className="text-sm text-gray-500 dark:text-gray-400">Loading flow view…</span>
    </output>
  ),
});
