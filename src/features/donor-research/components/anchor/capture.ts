import {
  COMMENT_ANCHOR_BOUNDS,
  type CommentAnchor,
  type CommentSectionKey,
  isCommentSectionKey,
} from "./types";

/**
 * Walks up from `node` until it hits an element carrying either
 * `data-candidate-id` or `data-section`. Returns null when no anchorable
 * ancestor exists.
 */
function findAnchorAncestor(
  node: Node | null
): { kind: "section"; id: CommentSectionKey } | { kind: "candidate"; id: string } | null {
  let current: Node | null = node;
  while (current) {
    if (current instanceof Element) {
      const candidateId = current.getAttribute("data-candidate-id");
      if (candidateId) return { kind: "candidate", id: candidateId };
      const sectionKey = current.getAttribute("data-section");
      if (sectionKey && isCommentSectionKey(sectionKey)) {
        return { kind: "section", id: sectionKey };
      }
    }
    current = current.parentNode;
  }
  return null;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Captures a text-range anchor from a DOM Selection. Returns null when:
 *   - the selection is empty (collapsed)
 *   - the selection straddles two different anchor targets
 *   - no anchor target ancestor exists for the selection
 *
 * The captured quote, prefix, and suffix are whitespace-normalized so
 * re-resolution survives React rerender churn.
 */
export function captureTextRangeAnchor(selection: Selection): CommentAnchor | null {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }
  const range = selection.getRangeAt(0);
  const startAncestor = findAnchorAncestor(range.startContainer);
  const endAncestor = findAnchorAncestor(range.endContainer);
  if (!startAncestor || !endAncestor) return null;
  if (startAncestor.kind !== endAncestor.kind || startAncestor.id !== endAncestor.id) {
    return null;
  }

  const quote = normalizeWhitespace(selection.toString());
  if (!quote || quote.length > COMMENT_ANCHOR_BOUNDS.QUOTE_MAX) return null;

  const targetEl =
    startAncestor.kind === "candidate"
      ? ((range.startContainer instanceof Element
          ? range.startContainer
          : range.startContainer.parentElement
        )?.closest(`[data-candidate-id="${startAncestor.id}"]`) ?? null)
      : ((range.startContainer instanceof Element
          ? range.startContainer
          : range.startContainer.parentElement
        )?.closest(`[data-section="${startAncestor.id}"]`) ?? null);
  if (!targetEl) return null;

  const targetText = normalizeWhitespace(targetEl.textContent ?? "");
  // Derive the quote's position from the actual selection boundary rather
  // than a global first-match: when the same text appears more than once in
  // the target block, indexOf(quote) would pick the wrong occurrence and the
  // stored prefix/suffix (and later resolution) would drift to it. The
  // normalized length of everything preceding the selection start gives the
  // quote's offset (±1 for a whitespace boundary that normalization trims),
  // so we search forward from there to snap to the selected occurrence.
  const preRange = document.createRange();
  preRange.selectNodeContents(targetEl);
  try {
    preRange.setEnd(range.startContainer, range.startOffset);
  } catch {
    // startContainer outside targetEl (shouldn't happen past the ancestor
    // check) — fall through to a first-match search below.
  }
  const precedingLen = normalizeWhitespace(preRange.toString()).length;
  let quoteIndex = targetText.indexOf(quote, Math.max(0, precedingLen - 1));
  if (quoteIndex === -1) quoteIndex = targetText.indexOf(quote);
  if (quoteIndex === -1) return null;

  const prefix = targetText
    .slice(Math.max(0, quoteIndex - COMMENT_ANCHOR_BOUNDS.PREFIX_MAX), quoteIndex)
    .slice(-COMMENT_ANCHOR_BOUNDS.PREFIX_MAX);
  const suffix = targetText
    .slice(quoteIndex + quote.length, quoteIndex + quote.length + COMMENT_ANCHOR_BOUNDS.SUFFIX_MAX)
    .slice(0, COMMENT_ANCHOR_BOUNDS.SUFFIX_MAX);

  return {
    kind: "text_range",
    targetKind: startAncestor.kind,
    targetId: startAncestor.id,
    quote,
    prefix,
    suffix,
  };
}

/**
 * Builds a pin anchor (section or candidate) for the supplied element.
 * Returns null when the element is not anchorable.
 */
export function captureElementAnchor(element: Element | null): CommentAnchor | null {
  if (!element) return null;
  const anchorEl = element.closest("[data-candidate-id], [data-section]");
  if (!anchorEl) return null;
  const candidateId = anchorEl.getAttribute("data-candidate-id");
  if (candidateId) return { kind: "candidate", candidateId };
  const sectionKey = anchorEl.getAttribute("data-section");
  if (sectionKey && isCommentSectionKey(sectionKey)) {
    return { kind: "section", sectionKey };
  }
  return null;
}
