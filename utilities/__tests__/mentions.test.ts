import { insertMention, parseMentions, renderMentionsAsMarkdown } from "../mentions";

describe("parseMentions", () => {
  it("should return an empty array for empty string", () => {
    expect(parseMentions("")).toEqual([]);
  });

  it("should return an empty array for null/undefined content", () => {
    expect(parseMentions(null as unknown as string)).toEqual([]);
    expect(parseMentions(undefined as unknown as string)).toEqual([]);
  });

  it("should return an empty array when no mentions are present", () => {
    expect(parseMentions("Hello world, no mentions here")).toEqual([]);
  });

  it("should parse a single mention", () => {
    const content = "Hello @[Alice](email:alice@example.com)!";
    const result = parseMentions(content);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      displayName: "Alice",
      email: "alice@example.com",
      raw: "@[Alice](email:alice@example.com)",
    });
  });

  it("should parse multiple mentions", () => {
    const content =
      "@[Alice](email:alice@example.com) and " + "@[Bob](email:bob@example.com) reviewed this";
    const result = parseMentions(content);

    expect(result).toHaveLength(2);
    expect(result[0].displayName).toBe("Alice");
    expect(result[1].displayName).toBe("Bob");
  });

  it("should preserve email addresses as-is", () => {
    const content = "@[Alice](email:Alice@Example.com)";
    const result = parseMentions(content);

    expect(result[0].email).toBe("Alice@Example.com");
  });

  it("should not match malformed mention tokens", () => {
    // Missing email: prefix
    expect(parseMentions("@[Alice](alice@example.com)")).toEqual([]);
    // Missing brackets
    expect(parseMentions("@Alice(email:alice@example.com)")).toEqual([]);
  });

  it("should handle mentions with spaces in display names", () => {
    const content = "@[Alice Wonderland](email:alice@example.com)";
    const result = parseMentions(content);

    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe("Alice Wonderland");
  });

  it("should preserve the raw token in the result", () => {
    const token = "@[Alice](email:alice@example.com)";
    const content = `Check with ${token} about this`;
    const result = parseMentions(content);

    expect(result[0].raw).toBe(token);
  });

  it("should handle content with only a mention token", () => {
    const content = "@[Alice](email:alice@example.com)";
    const result = parseMentions(content);

    expect(result).toHaveLength(1);
  });
});

describe("insertMention", () => {
  const reviewer = {
    name: "Alice",
    email: "alice@example.com",
  };

  it("should insert a mention at the end of content where @ was typed", () => {
    const content = "Hello @Al";
    const result = insertMention(content, content.length, reviewer, "Al");

    expect(result).toBe("Hello @[Alice](email:alice@example.com) ");
  });

  it("should insert a mention when @ is at the start of content", () => {
    const content = "@Al";
    const result = insertMention(content, content.length, reviewer, "Al");

    expect(result).toBe("@[Alice](email:alice@example.com) ");
  });

  it("should return content unchanged when no @ is found", () => {
    const content = "Hello world";
    const result = insertMention(content, content.length, reviewer, "");

    expect(result).toBe("Hello world");
  });

  it("should replace @ and filter text with the mention token", () => {
    const content = "Please review @Bob";
    const cursorPosition = content.length;
    const result = insertMention(content, cursorPosition, reviewer, "Bob");

    // The function replaces from the last @ to cursorPosition
    expect(result).toContain("@[Alice]");
    expect(result).not.toContain("@Bob");
  });

  it("should preserve text after the cursor position", () => {
    const content = "Hello @Al some trailing text";
    const cursorPosition = 9; // right after "@Al"
    const result = insertMention(content, cursorPosition, reviewer, "Al");

    expect(result).toBe("Hello @[Alice](email:alice@example.com)  some trailing text");
  });

  it("should add a trailing space after the mention token", () => {
    const content = "@";
    const result = insertMention(content, 1, reviewer, "");

    expect(result).toMatch(/\) $/);
  });

  it("should use the last @ when multiple @ symbols exist", () => {
    const content = "email@test.com and @Al";
    const result = insertMention(content, content.length, reviewer, "Al");

    expect(result).toContain("email@test.com and @[Alice]");
  });
});

describe("renderMentionsAsMarkdown", () => {
  it("should return empty string for empty input", () => {
    expect(renderMentionsAsMarkdown("")).toBe("");
  });

  it("should return falsy values as-is", () => {
    expect(renderMentionsAsMarkdown(null as unknown as string)).toBe(null);
    expect(renderMentionsAsMarkdown(undefined as unknown as string)).toBe(undefined);
  });

  it("should convert a single mention to bold markdown", () => {
    const content = "Hello @[Alice](email:alice@example.com)!";
    const result = renderMentionsAsMarkdown(content);

    expect(result).toBe("Hello **@Alice**!");
  });

  it("should convert multiple mentions to bold markdown", () => {
    const content = "@[Alice](email:alice@example.com) and " + "@[Bob](email:bob@example.com)";
    const result = renderMentionsAsMarkdown(content);

    expect(result).toBe("**@Alice** and **@Bob**");
  });

  it("should leave content without mentions unchanged", () => {
    const content = "Just a regular comment without any mentions";
    expect(renderMentionsAsMarkdown(content)).toBe(content);
  });

  it("should handle mentions with spaces in display names", () => {
    const content = "Check with @[Alice Wonderland](email:alice@example.com)";
    const result = renderMentionsAsMarkdown(content);

    expect(result).toBe("Check with **@Alice Wonderland**");
  });

  it("should preserve surrounding text", () => {
    const content = "Before @[Alice](email:alice@example.com) after";
    const result = renderMentionsAsMarkdown(content);

    expect(result).toBe("Before **@Alice** after");
  });
});
