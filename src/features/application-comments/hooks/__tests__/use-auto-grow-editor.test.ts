import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clampEditorHeight, resolveMaxHeight, useAutoGrowEditor } from "../use-auto-grow-editor";

type ObserverCallback = () => void;

let observerCallbacks: ObserverCallback[] = [];

class ResizeObserverStub {
  constructor(callback: ObserverCallback) {
    observerCallbacks.push(callback);
  }
  observe() {}
  disconnect() {}
}

interface EditorDom {
  container: HTMLDivElement;
  setLines: (count: number, lineHeight?: number) => void;
}

const EDITOR_BORDER = 2;
const SCROLLER_PADDING = 20;
const CONTENT_PADDING = 8;

function defineHeight(el: HTMLElement, height: number) {
  Object.defineProperty(el, "offsetHeight", { configurable: true, get: () => height });
}

function buildEditorDom(editorHeight: number): EditorDom {
  const container = document.createElement("div");
  const editor = document.createElement("div");
  editor.className = "md-editor";
  const scroller = document.createElement("div");
  scroller.className = "cm-scroller";
  const content = document.createElement("div");
  content.className = "cm-content";
  content.style.paddingTop = `${CONTENT_PADDING / 2}px`;
  content.style.paddingBottom = `${CONTENT_PADDING / 2}px`;
  scroller.appendChild(content);
  editor.appendChild(scroller);
  container.appendChild(editor);
  document.body.appendChild(container);

  const setLines = (count: number, lineHeight = 20) => {
    content.replaceChildren();
    for (let i = 0; i < count; i++) {
      const line = document.createElement("div");
      line.className = "cm-line";
      line.getBoundingClientRect = () =>
        ({ top: i * lineHeight, bottom: (i + 1) * lineHeight }) as DOMRect;
      content.appendChild(line);
    }
    const textHeight = count * lineHeight + CONTENT_PADDING;
    const scrollerHeight = editorHeight - EDITOR_BORDER;
    const contentHeight = Math.max(textHeight, scrollerHeight - SCROLLER_PADDING);
    defineHeight(editor, editorHeight);
    defineHeight(scroller, scrollerHeight);
    Object.defineProperty(scroller, "clientHeight", {
      configurable: true,
      get: () => scrollerHeight,
    });
    Object.defineProperty(scroller, "scrollHeight", {
      configurable: true,
      get: () => contentHeight + SCROLLER_PADDING,
    });
    defineHeight(content, contentHeight);
  };

  return { container, setLines };
}

describe("clampEditorHeight", () => {
  it("keeps the height between min and max", () => {
    expect(clampEditorHeight(50, 100, 400)).toBe(100);
    expect(clampEditorHeight(250, 100, 400)).toBe(250);
    expect(clampEditorHeight(900, 100, 400)).toBe(400);
  });

  it("never lets max drop below min", () => {
    expect(clampEditorHeight(900, 100, 40)).toBe(100);
  });
});

describe("resolveMaxHeight", () => {
  it("uses the explicit cap when given", () => {
    expect(resolveMaxHeight(250, 1000)).toBe(250);
  });

  it("falls back to 40% of the viewport", () => {
    expect(resolveMaxHeight(undefined, 1000)).toBe(400);
  });
});

describe("useAutoGrowEditor", () => {
  beforeEach(() => {
    observerCallbacks = [];
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("starts at minHeight and grows with the text", () => {
    const dom = buildEditorDom(100);
    dom.setLines(1);
    const ref = { current: dom.container };

    const { result } = renderHook(() => useAutoGrowEditor(ref, { minHeight: 100 }));
    expect(result.current).toBe(100);

    dom.setLines(10);
    act(() => {
      for (const cb of observerCallbacks) cb();
    });
    expect(result.current).toBe(10 * 20 + CONTENT_PADDING + SCROLLER_PADDING + EDITOR_BORDER);
  });

  it("caps at 40% of the viewport and shrinks back to minHeight", () => {
    const dom = buildEditorDom(100);
    dom.setLines(1);
    const ref = { current: dom.container };

    const { result } = renderHook(() => useAutoGrowEditor(ref, { minHeight: 100 }));

    dom.setLines(100);
    act(() => {
      for (const cb of observerCallbacks) cb();
    });
    expect(result.current).toBe(400);

    dom.setLines(1);
    act(() => {
      for (const cb of observerCallbacks) cb();
    });
    expect(result.current).toBe(100);
  });

  it("stays at minHeight while disabled", () => {
    const dom = buildEditorDom(100);
    dom.setLines(10);
    const ref = { current: dom.container };

    const { result } = renderHook(() => useAutoGrowEditor(ref, { minHeight: 100, enabled: false }));
    expect(result.current).toBe(100);
    expect(observerCallbacks).toHaveLength(0);
  });
});
