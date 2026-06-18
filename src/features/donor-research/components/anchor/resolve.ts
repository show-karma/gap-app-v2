import type { CommentAnchor, TextRangeAnchor } from "./types";

export type ResolvedAnchor =
  | { kind: "element"; element: Element }
  | { kind: "range"; range: Range; element: Element }
  | { kind: "orphan" };

function findTargetElement(anchor: CommentAnchor, root: Element): Element | null {
  if (anchor.kind === "section") {
    return root.querySelector(`[data-section="${anchor.sectionKey}"]`);
  }
  if (anchor.kind === "candidate") {
    return root.querySelector(`[data-candidate-id="${anchor.candidateId}"]`);
  }
  if (anchor.targetKind === "section") {
    return root.querySelector(`[data-section="${anchor.targetId}"]`);
  }
  return root.querySelector(`[data-candidate-id="${anchor.targetId}"]`);
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Builds a DOM Range covering the resolved quote within `targetEl`.
 * Walks text nodes accumulating normalized lengths until we find the
 * start + end offsets matching the captured quote.
 *
 * Returns null on miss; the caller routes that to the orphan lane.
 */
function buildRangeForQuote(
  targetEl: Element,
  anchor: TextRangeAnchor
): Range | null {
  const normalized = normalizeWhitespace(targetEl.textContent ?? "");
  const search = anchor.prefix + anchor.quote + anchor.suffix;
  let startIdx = normalized.indexOf(search);
  if (startIdx === -1) {
    // Fall back to quote-only match — degrades gracefully when prefix
    // or suffix changed but the quote survives.
    startIdx = normalized.indexOf(anchor.quote);
    if (startIdx === -1) return null;
  } else {
    startIdx += anchor.prefix.length;
  }
  const endIdx = startIdx + anchor.quote.length;

  // Walk text nodes building up a normalized offset → original-node map.
  const walker = document.createTreeWalker(targetEl, NodeFilter.SHOW_TEXT);
  let normalizedSoFar = 0;
  let range: Range | null = null;
  const cursor: { node: Text | null; nodeOffset: number } = {
    node: null,
    nodeOffset: 0,
  };
  let pendingStart = false;
  let pendingEnd = false;
  while (walker.nextNode()) {
    const textNode = walker.currentNode as Text;
    const original = textNode.data;
    // For each character in `original`, compute how it contributes to
    // the normalized form. We treat any run of whitespace as a single
    // space — same rule used in `normalizeWhitespace`.
    let lastWasSpace = normalizedSoFar > 0 && normalizedNeighbourEndsWith(targetEl, walker, textNode) === " ";
    for (let i = 0; i < original.length; i += 1) {
      const ch = original[i];
      const isWs = /\s/.test(ch);
      let contributes: number;
      if (isWs) {
        contributes = lastWasSpace ? 0 : 1;
        lastWasSpace = true;
      } else {
        contributes = 1;
        lastWasSpace = false;
      }
      if (contributes === 0) continue;
      if (!range && normalizedSoFar === startIdx) {
        range = document.createRange();
        range.setStart(textNode, i);
        pendingStart = false;
      } else if (!range) {
        pendingStart = true;
      }
      if (range && normalizedSoFar === endIdx - 1) {
        // After consuming this char we're at endIdx. Set end after
        // this position.
        range.setEnd(textNode, i + 1);
        pendingEnd = true;
      }
      normalizedSoFar += 1;
    }
    if (range && pendingEnd) break;
    cursor.node = textNode;
    cursor.nodeOffset = original.length;
  }
  // Reference unused vars to keep TS happy under noUnusedLocals.
  void pendingStart;
  void cursor;
  if (!range || !pendingEnd) return null;
  return range;
}

// Placeholder helper — the resolver walks left-to-right so we don't
// actually need lookahead; declaring this keeps the contribution
// algorithm readable without adding a runtime dep.
function normalizedNeighbourEndsWith(
  _targetEl: Element,
  _walker: TreeWalker,
  _node: Text
): string {
  return "";
}

export function resolveAnchor(
  anchor: CommentAnchor,
  root: Element
): ResolvedAnchor {
  const target = findTargetElement(anchor, root);
  if (!target) return { kind: "orphan" };

  if (anchor.kind === "section" || anchor.kind === "candidate") {
    return { kind: "element", element: target };
  }

  const range = buildRangeForQuote(target, anchor);
  if (!range) return { kind: "orphan" };
  return { kind: "range", range, element: target };
}
