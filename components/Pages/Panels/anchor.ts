import type { Anchor } from "./types";

export interface BlockRef {
  id: string;
  label: string;
  el: HTMLElement;
}

export function readBlocks(root: ShadowRoot): BlockRef[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-pl-id]")).map((el) => ({
    id: el.dataset.plId ?? "",
    label: labelOf(el),
    el,
  }));
}

function labelOf(el: HTMLElement): string {
  const text = el.textContent?.replace(/\s+/g, " ").trim() ?? "";
  return text.length > 60 ? `${text.slice(0, 60)}…` : text || "(empty block)";
}

export type AnchorMatch = { kind: "id" | "label"; block: BlockRef } | { kind: "orphan" };

export function resolveAnchor(blocks: BlockRef[], anchor: Anchor): AnchorMatch {
  const byId = blocks.find((block) => block.id === anchor.id);
  if (byId) return { kind: "id", block: byId };

  const byLabel = blocks.find((block) => block.label === anchor.label);
  if (byLabel) return { kind: "label", block: byLabel };

  return { kind: "orphan" };
}
