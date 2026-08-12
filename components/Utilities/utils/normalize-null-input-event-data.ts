/**
 * GAP-FRONTEND-1WY: md-editor-rt@6.4.1 destructures `InputEvent.data` inside its
 * CodeMirror `input` DOM-event handler and reads `.length` on it in the
 * `maxLength` overlength check. Per the Input Events spec, `data` is null for
 * `deleteContentBackward`, `insertParagraph`/`insertLineBreak`,
 * `insertFromPaste` and `insertFromDrop` (common on mobile IME deletions,
 * Enter and paste), so the handler throws
 * `TypeError: Cannot read properties of null (reading 'length')`.
 *
 * The library invokes the consumer's `onInput` callback with the raw event
 * BEFORE destructuring `.data`, so this handler normalizes the event first:
 * `InputEvent.data` is a prototype getter, and defining an own `""` value
 * property shadows it for every later read. `null -> ""` makes the overlength
 * check compute `modelValue.length + 0`, which is the correct semantics for
 * deletions/Enter — genuine overlength insertions still fire the overlength
 * event. Remove once upstream fixes the null guard (imzbf/md-editor-rt).
 *
 * Kept in a non-component module so `MarkdownEditor.tsx` only exports
 * components (React Fast Refresh / react-doctor `only-export-components`).
 */
export function normalizeNullInputEventData(event: Event): void {
  if ((event as InputEvent).data == null) {
    Object.defineProperty(event, "data", { value: "", configurable: true });
  }
}
