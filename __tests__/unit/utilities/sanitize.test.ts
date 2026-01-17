import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { sanitizeInput, sanitizeObject } from "@/utilities/sanitize";

describe("sanitizeInput", () => {
  describe("String Sanitization", () => {
    it("should trim whitespace from strings", () => {
      expect(sanitizeInput("  hello  ")).toBe("hello");
    });

    it("should trim leading whitespace", () => {
      expect(sanitizeInput("  hello")).toBe("hello");
    });

    it("should trim trailing whitespace", () => {
      expect(sanitizeInput("hello  ")).toBe("hello");
    });

    it("should handle tabs and newlines", () => {
      expect(sanitizeInput("\t\nhello\n\t")).toBe("hello");
    });

    it("should preserve internal whitespace", () => {
      expect(sanitizeInput("  hello world  ")).toBe("hello world");
    });

    it("should handle empty string", () => {
      expect(sanitizeInput("")).toBe("");
    });

    it("should handle string with only whitespace", () => {
      expect(sanitizeInput("   ")).toBe("");
    });
  });

  describe("Non-String Input", () => {
    it("should return numbers unchanged", () => {
      expect(sanitizeInput(42)).toBe(42);
    });

    it("should return zero unchanged", () => {
      expect(sanitizeInput(0)).toBe(0);
    });

    it("should return negative numbers unchanged", () => {
      expect(sanitizeInput(-42)).toBe(-42);
    });

    it("should return boolean true unchanged", () => {
      expect(sanitizeInput(true)).toBe(true);
    });

    it("should return boolean false unchanged", () => {
      expect(sanitizeInput(false)).toBe(false);
    });

    it("should return null unchanged", () => {
      expect(sanitizeInput(null)).toBe(null);
    });

    it("should return undefined unchanged", () => {
      expect(sanitizeInput(undefined)).toBe(undefined);
    });

    it("should return arrays unchanged", () => {
      const arr = [1, 2, 3];
      expect(sanitizeInput(arr)).toBe(arr);
    });

    it("should return objects unchanged", () => {
      const obj = { key: "value" };
      expect(sanitizeInput(obj)).toBe(obj);
    });
  });

  describe("Edge Cases", () => {
    it("should handle unicode whitespace", () => {
      expect(sanitizeInput("\u00A0hello\u00A0")).toBe("hello");
    });

    it("should handle very long strings", () => {
      const longString = ` ${"a".repeat(10000)} `;
      expect(sanitizeInput(longString)).toBe("a".repeat(10000));
    });

    it("should handle special characters", () => {
      expect(sanitizeInput("  !@#$%^&*()  ")).toBe("!@#$%^&*()");
    });

    it("should handle email addresses", () => {
      expect(sanitizeInput("  test@example.com  ")).toBe("test@example.com");
    });

    it("should handle URLs", () => {
      expect(sanitizeInput("  https://example.com  ")).toBe("https://example.com");
    });
  });
});

describe("sanitizeObject", () => {
  describe("Simple Objects", () => {
    it("should sanitize string properties", () => {
      const input = { name: "  John  ", email: "  john@example.com  " };
      const expected = { name: "John", email: "john@example.com" };
      expect(sanitizeObject(input)).toEqual(expected);
    });

    it("should preserve non-string properties", () => {
      const input = { age: 25, active: true, score: null };
      expect(sanitizeObject(input)).toEqual(input);
    });

    it("should handle mixed property types", () => {
      const input = { name: "  John  ", age: 25, active: true };
      const expected = { name: "John", age: 25, active: true };
      expect(sanitizeObject(input)).toEqual(expected);
    });

    it("should handle empty objects", () => {
      expect(sanitizeObject({})).toEqual({});
    });
  });

  describe("Nested Objects", () => {
    it("should sanitize nested string properties", () => {
      const input = {
        user: {
          name: "  John  ",
          email: "  john@example.com  ",
        },
      };
      const expected = {
        user: {
          name: "John",
          email: "john@example.com",
        },
      };
      expect(sanitizeObject(input)).toEqual(expected);
    });

    it("should handle deeply nested objects", () => {
      const input = {
        level1: {
          level2: {
            level3: {
              name: "  Deep  ",
            },
          },
        },
      };
      const expected = {
        level1: {
          level2: {
            level3: {
              name: "Deep",
            },
          },
        },
      };
      expect(sanitizeObject(input)).toEqual(expected);
    });

    it("should preserve nested non-string values", () => {
      const input = {
        user: {
          age: 25,
          settings: {
            notifications: true,
          },
        },
      };
      expect(sanitizeObject(input)).toEqual(input);
    });
  });

  describe("Arrays", () => {
    it("should sanitize string arrays", () => {
      const input = ["  hello  ", "  world  "];
      const expected = ["hello", "world"];
      expect(sanitizeObject(input)).toEqual(expected);
    });

    it("should preserve non-string arrays", () => {
      const input = [1, 2, 3, true, false];
      expect(sanitizeObject(input)).toEqual(input);
    });

    it("should handle mixed type arrays", () => {
      const input = ["  hello  ", 42, true, "  world  "];
      const expected = ["hello", 42, true, "world"];
      expect(sanitizeObject(input)).toEqual(expected);
    });

    it("should handle empty arrays", () => {
      expect(sanitizeObject([])).toEqual([]);
    });

    it("should handle arrays of objects", () => {
      const input = [{ name: "  John  " }, { name: "  Jane  " }];
      const expected = [{ name: "John" }, { name: "Jane" }];
      expect(sanitizeObject(input)).toEqual(expected);
    });

    it("should handle nested arrays", () => {
      const input = [
        ["  a  ", "  b  "],
        ["  c  ", "  d  "],
      ];
      const expected = [
        ["a", "b"],
        ["c", "d"],
      ];
      expect(sanitizeObject(input)).toEqual(expected);
    });
  });

  describe("Complex Structures", () => {
    it("should handle objects with array properties", () => {
      const input = {
        name: "  John  ",
        tags: ["  tag1  ", "  tag2  "],
      };
      const expected = {
        name: "John",
        tags: ["tag1", "tag2"],
      };
      expect(sanitizeObject(input)).toEqual(expected);
    });

    it("should handle arrays with nested objects", () => {
      const input = {
        users: [
          { name: "  John  ", email: "  john@example.com  " },
          { name: "  Jane  ", email: "  jane@example.com  " },
        ],
      };
      const expected = {
        users: [
          { name: "John", email: "john@example.com" },
          { name: "Jane", email: "jane@example.com" },
        ],
      };
      expect(sanitizeObject(input)).toEqual(expected);
    });

    it("should handle deeply complex structures", () => {
      const input = {
        project: {
          name: "  Project  ",
          members: [
            {
              user: { name: "  John  " },
              roles: ["  admin  ", "  user  "],
            },
          ],
        },
      };
      const expected = {
        project: {
          name: "Project",
          members: [
            {
              user: { name: "John" },
              roles: ["admin", "user"],
            },
          ],
        },
      };
      expect(sanitizeObject(input)).toEqual(expected);
    });
  });

  describe("Special Cases", () => {
    it("should handle Date objects", () => {
      const date = new Date("2024-01-01");
      const input = { created: date };
      const result = sanitizeObject(input);
      expect(result.created).toBe(date);
      expect(result.created instanceof Date).toBe(true);
    });

    it("should handle null values", () => {
      expect(sanitizeObject(null)).toBe(null);
    });

    it("should handle undefined values", () => {
      expect(sanitizeObject(undefined)).toBe(undefined);
    });

    it("should handle null object properties", () => {
      const input = { name: "  John  ", value: null };
      const expected = { name: "John", value: null };
      expect(sanitizeObject(input)).toEqual(expected);
    });

    it("should handle undefined object properties", () => {
      const input = { name: "  John  ", value: undefined };
      const expected = { name: "John", value: undefined };
      expect(sanitizeObject(input)).toEqual(expected);
    });
  });

  describe("Primitive Input", () => {
    it("should handle string input", () => {
      expect(sanitizeObject("  hello  ")).toBe("hello");
    });

    it("should handle number input", () => {
      expect(sanitizeObject(42)).toBe(42);
    });

    it("should handle boolean input", () => {
      expect(sanitizeObject(true)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle objects with symbol keys", () => {
      const sym = Symbol("test");
      const input = { [sym]: "  value  ", name: "  John  " };
      const result = sanitizeObject(input);
      expect(result.name).toBe("John");
      // Symbol properties are not enumerable by Object.entries, so they won't be included
    });

    it("should handle very large objects", () => {
      const input: any = {};
      for (let i = 0; i < 1000; i++) {
        input[`key${i}`] = `  value${i}  `;
      }
      const result = sanitizeObject(input);
      expect(result.key0).toBe("value0");
      expect(result.key999).toBe("value999");
    });

    it("should handle objects with numeric keys", () => {
      const input = { 0: "  first  ", 1: "  second  " };
      const expected = { 0: "first", 1: "second" };
      expect(sanitizeObject(input)).toEqual(expected);
    });

    it("should not create circular reference issues", () => {
      const input = { name: "  John  ", age: 25 };
      const result = sanitizeObject(input);
      expect(result).not.toBe(input); // Should create new object
      expect(result).toEqual({ name: "John", age: 25 });
    });
  });

  describe("Real-World Use Cases", () => {
    it("should sanitize form data", () => {
      const formData = {
        name: "  John Doe  ",
        email: "  john@example.com  ",
        message: "  Hello World  ",
        subscribe: true,
      };
      const expected = {
        name: "John Doe",
        email: "john@example.com",
        message: "Hello World",
        subscribe: true,
      };
      expect(sanitizeObject(formData)).toEqual(expected);
    });

    it("should sanitize API request payload", () => {
      const payload = {
        user: {
          name: "  John  ",
          email: "  john@example.com  ",
        },
        metadata: {
          source: "  web  ",
          tags: ["  tag1  ", "  tag2  "],
        },
      };
      const expected = {
        user: {
          name: "John",
          email: "john@example.com",
        },
        metadata: {
          source: "web",
          tags: ["tag1", "tag2"],
        },
      };
      expect(sanitizeObject(payload)).toEqual(expected);
    });

    it("should sanitize user profile data", () => {
      const profile = {
        username: "  johndoe  ",
        bio: "  Software Developer  ",
        social: {
          twitter: "  @johndoe  ",
          github: "  johndoe  ",
        },
        interests: ["  coding  ", "  music  "],
      };
      const expected = {
        username: "johndoe",
        bio: "Software Developer",
        social: {
          twitter: "@johndoe",
          github: "johndoe",
        },
        interests: ["coding", "music"],
      };
      expect(sanitizeObject(profile)).toEqual(expected);
    });
  });
});
