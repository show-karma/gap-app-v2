/**
 * Regression tests for sanitizeObject circular reference handling.
 *
 * Bug: sanitizeObject recursively processes objects without cycle detection,
 * causing stack overflow on circular references.
 * Fix: Added WeakSet-based seen-set guard to prevent infinite recursion.
 */

import { describe, expect, it } from "vitest";
import { sanitizeObject } from "@/utilities/sanitize";

describe("sanitizeObject — circular reference handling", () => {
  it("handles direct circular reference (a.self = a) without crashing", () => {
    const obj: Record<string, unknown> = { name: "  John  " };
    obj.self = obj;

    const result = sanitizeObject(obj);
    expect(result.name).toBe("John");
    // The circular ref should be preserved (returns original ref) rather than infinite recursion
    expect(result.self).toBe(obj);
  });

  it("handles indirect circular reference (a.b.parent = a) without crashing", () => {
    const parent: Record<string, unknown> = { label: "  parent  " };
    const child: Record<string, unknown> = { label: "  child  ", parent };
    parent.child = child;

    const result = sanitizeObject(parent);
    expect(result.label).toBe("parent");
    expect(result.child.label).toBe("child");
    // parent reference in child should be the original (circular ref guard kicks in)
    expect(result.child.parent).toBe(parent);
  });

  it("handles deep nesting (15+ levels) without stack overflow", () => {
    // Build a 15-level deep object
    let current: Record<string, unknown> = { value: "  deepest  " };
    for (let i = 14; i >= 0; i--) {
      current = { value: `  level${i}  `, nested: current };
    }

    const result = sanitizeObject(current);
    expect(result.value).toBe("level0");

    // Walk to the deepest level
    let node = result;
    for (let i = 0; i < 15; i++) {
      node = node.nested;
    }
    expect(node.value).toBe("deepest");
  });

  it("handles arrays containing circular references", () => {
    const obj: Record<string, unknown> = { name: "  test  " };
    const arr = [obj, "  hello  ", obj];
    obj.list = arr;

    const result = sanitizeObject(arr);
    expect(result[1]).toBe("hello");
    // First element is sanitized, second occurrence of obj returns original ref
    expect(result[0].name).toBe("test");
    expect(result[2]).toBe(obj);
  });

  it("handles null and undefined inputs without crashing", () => {
    expect(sanitizeObject(null)).toBe(null);
    expect(sanitizeObject(undefined)).toBe(undefined);
  });
});
