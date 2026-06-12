import {
  optionalEmail,
  optionalString,
  optionalUrl,
  requiredString,
  requiredUrl,
} from "../zod-primitives";

function firstError(result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}): string {
  if (result.success) throw new Error("expected validation to fail");
  return result.error!.issues[0].message;
}

describe("zod-primitives", () => {
  describe("requiredString", () => {
    it("reports the required message for an empty value (not the length message)", () => {
      const schema = requiredString("Name", { min: 3 });
      expect(firstError(schema.safeParse(""))).toBe("Name is required");
    });

    it("reports the required message for whitespace-only input", () => {
      const schema = requiredString("Name", { min: 3 });
      expect(firstError(schema.safeParse("   "))).toBe("Name is required");
    });

    it("reports the min-length message for a too-short non-empty value", () => {
      const schema = requiredString("Name", { min: 3 });
      expect(firstError(schema.safeParse("ab"))).toBe("Name must be at least 3 characters");
    });

    it("accepts a valid value and trims it", () => {
      const schema = requiredString("Name", { min: 3 });
      const result = schema.safeParse("  Alice  ");
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe("Alice");
    });

    it("honours a custom required message override", () => {
      const schema = requiredString("Name", {
        min: 3,
        messages: { required: "Please tell us your name" },
      });
      expect(firstError(schema.safeParse(""))).toBe("Please tell us your name");
    });

    it("honours custom min/max message overrides while keeping required precedence", () => {
      const schema = requiredString("Title", {
        min: 3,
        max: 5,
        messages: { min: "Too short", max: "Too long" },
      });
      expect(firstError(schema.safeParse(""))).toBe("Title is required");
      expect(firstError(schema.safeParse("ab"))).toBe("Too short");
      expect(firstError(schema.safeParse("abcdef"))).toBe("Too long");
    });
  });

  describe("optionalString", () => {
    it("accepts the empty string", () => {
      expect(optionalString().safeParse("").success).toBe(true);
    });

    it("accepts undefined", () => {
      expect(optionalString().safeParse(undefined).success).toBe(true);
    });

    it("accepts a normal value", () => {
      expect(optionalString().safeParse("hello").success).toBe(true);
    });

    it("still accepts the empty string when min/max are supplied", () => {
      const schema = optionalString({ min: 3, max: 5 });
      expect(schema.safeParse("").success).toBe(true);
      expect(schema.safeParse(undefined).success).toBe(true);
    });

    it("enforces min/max on non-empty values", () => {
      const schema = optionalString({
        min: 3,
        max: 5,
        minMessage: "Too short",
        maxMessage: "Too long",
      });
      expect(firstError(schema.safeParse("ab"))).toBe("Too short");
      expect(firstError(schema.safeParse("abcdef"))).toBe("Too long");
      expect(schema.safeParse("abcd").success).toBe(true);
    });
  });

  describe("requiredUrl", () => {
    it("reports the required message for an empty value", () => {
      expect(firstError(requiredUrl("Runtime URL").safeParse(""))).toBe("Runtime URL is required");
    });

    it("reports the invalid message for a malformed URL", () => {
      expect(firstError(requiredUrl("Runtime URL").safeParse("not-a-valid-url"))).toBe(
        "Please enter a valid URL"
      );
    });

    it("accepts a valid URL", () => {
      expect(requiredUrl("Runtime URL").safeParse("https://team-acme.karma.xyz").success).toBe(
        true
      );
    });
  });

  describe("optionalUrl", () => {
    it("accepts empty/undefined", () => {
      expect(optionalUrl().safeParse("").success).toBe(true);
      expect(optionalUrl().safeParse(undefined).success).toBe(true);
    });

    it("rejects a malformed URL", () => {
      expect(optionalUrl().safeParse("not a url").success).toBe(false);
    });

    it("accepts a valid URL", () => {
      expect(optionalUrl().safeParse("https://example.com").success).toBe(true);
    });
  });

  describe("optionalEmail", () => {
    it("accepts empty/undefined", () => {
      expect(optionalEmail().safeParse("").success).toBe(true);
      expect(optionalEmail().safeParse(undefined).success).toBe(true);
    });

    it("accepts a valid email", () => {
      expect(optionalEmail().safeParse("user@example.com").success).toBe(true);
    });

    it("rejects an invalid email", () => {
      expect(optionalEmail().safeParse("nope").success).toBe(false);
    });
  });
});
