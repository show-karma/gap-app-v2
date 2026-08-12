import { describe, expect, it } from "vitest";
import { buildModelOptions, formatModelLabel } from "@/utilities/portfolio-reports/modelOptions";

describe("formatModelLabel", () => {
  it("appends the provider for known prefixes", () => {
    expect(formatModelLabel("gpt-5.2")).toBe("gpt-5.2 (OpenAI)");
    expect(formatModelLabel("claude-haiku-4-5-20251001")).toBe(
      "claude-haiku-4-5-20251001 (Anthropic)"
    );
    expect(formatModelLabel("grok-4-1-fast-reasoning")).toBe("grok-4-1-fast-reasoning (xAI)");
    expect(formatModelLabel("gemini-2.5-pro")).toBe("gemini-2.5-pro (Google)");
  });

  it("returns the raw id for unknown prefixes", () => {
    expect(formatModelLabel("o3-mini")).toBe("o3-mini");
    expect(formatModelLabel("")).toBe("");
  });
});

describe("buildModelOptions", () => {
  const available = ["gpt-5.2", "claude-haiku-4-5-20251001"];

  it("returns the available list when no current model is set", () => {
    expect(buildModelOptions(available)).toEqual(available);
  });

  it("returns the available list when the current model is already in it", () => {
    expect(buildModelOptions(available, "gpt-5.2")).toEqual(available);
  });

  it("appends a stored model that was removed from the settings list", () => {
    expect(buildModelOptions(available, "gpt-4o")).toEqual([...available, "gpt-4o"]);
  });

  it("keeps the stored model selectable even when the list is empty", () => {
    expect(buildModelOptions([], "gpt-4o")).toEqual(["gpt-4o"]);
  });
});
