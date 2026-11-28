const GUTTER = 12;

/**
 * Beside the block when there is room on the right, otherwise on its left,
 * clamped so the card never leaves the viewport. Shadow DOM elements report
 * viewport coordinates, so these feed a fixed-position element directly.
 */
export function anchoredPosition(
  rect: DOMRect,
  width: number,
  height: number
): { left: number; top: number } {
  const spaceRight = window.innerWidth - rect.right;
  const left =
    spaceRight > width + GUTTER * 2
      ? rect.right + GUTTER
      : Math.max(GUTTER, rect.left - width - GUTTER);

  const top = Math.min(Math.max(GUTTER, rect.top), window.innerHeight - height - GUTTER);

  return { left, top };
}
