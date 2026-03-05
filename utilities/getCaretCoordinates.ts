/**
 * Computes the pixel (top, left) of the caret at a given character index
 * inside a <textarea>, relative to the textarea element itself.
 *
 * Uses the "mirror div" technique: creates an off-screen div that replicates
 * the textarea's styling, inserts text up to the target index, then measures
 * where the caret span lands.
 */

const TEXTAREA_PROPERTIES = [
  "direction",
  "box-sizing",
  "width",
  "height",
  "overflow-x",
  "overflow-y",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-style",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "font-style",
  "font-variant",
  "font-weight",
  "font-stretch",
  "font-size",
  "font-size-adjust",
  "line-height",
  "font-family",
  "text-align",
  "text-transform",
  "text-indent",
  "text-decoration",
  "letter-spacing",
  "word-spacing",
  "tab-size",
  "-moz-tab-size",
  "white-space",
  "word-wrap",
  "word-break",
] as const;

export interface CaretCoordinates {
  top: number;
  left: number;
}

export function getCaretCoordinates(
  element: HTMLTextAreaElement,
  position: number
): CaretCoordinates {
  const div = document.createElement("div");
  div.id = "mention-caret-mirror";
  document.body.appendChild(div);

  const style = div.style;
  const computed = window.getComputedStyle(element);

  style.whiteSpace = "pre-wrap";
  style.wordWrap = "break-word";
  style.position = "absolute";
  style.visibility = "hidden";
  style.overflow = "hidden";

  for (const prop of TEXTAREA_PROPERTIES) {
    style.setProperty(prop, computed.getPropertyValue(prop));
  }

  div.textContent = element.value.substring(0, position);

  const span = document.createElement("span");
  span.textContent = element.value.substring(position) || "\u200b";
  div.appendChild(span);

  const coordinates: CaretCoordinates = {
    top: span.offsetTop - element.scrollTop,
    left: span.offsetLeft - element.scrollLeft,
  };

  document.body.removeChild(div);

  return coordinates;
}
