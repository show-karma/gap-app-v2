import type { HighlightResult } from "@streamdown/code";
import { describe, expect, it } from "vitest";
import { code, createCodePlugin } from "@/utilities/markdown-code-highlighter";

const THEMES: [string, string] = ["github-light", "github-dark"];

function highlightAsync(
  plugin: ReturnType<typeof createCodePlugin>,
  source: string,
  language: string
): Promise<HighlightResult> {
  return new Promise((resolve) => {
    const immediate = plugin.highlight(
      { code: source, language: language as never, themes: THEMES },
      resolve
    );
    if (immediate) resolve(immediate);
  });
}

describe("markdown-code-highlighter", () => {
  it("has the @streamdown/code plugin shape", () => {
    expect(code.name).toBe("shiki");
    expect(code.type).toBe("code-highlighter");
    expect(code.getThemes()).toEqual(["github-light", "github-dark"]);
  });

  it("supports the listed languages and their aliases", () => {
    expect(code.getSupportedLanguages()).toEqual(
      expect.arrayContaining(["typescript", "solidity", "python", "shellscript"])
    );
    for (const alias of ["ts", "TSX", " sol ", "bash", "py", "yml"]) {
      expect(code.supportsLanguage(alias as never)).toBe(true);
    }
    expect(code.supportsLanguage("cobol" as never)).toBe(false);
  });

  it("returns null first, then delivers tokens and serves them from cache", async () => {
    const plugin = createCodePlugin();
    const source = "const answer: number = 42;";

    const result = await highlightAsync(plugin, source, "ts");
    expect(result.tokens.length).toBeGreaterThan(0);
    expect(result.tokens[0].map((token) => token.content).join("")).toBe(source);

    expect(plugin.highlight({ code: source, language: "ts" as never, themes: THEMES })).toBe(
      result
    );
  });

  it("renders a language it does not register as plain text", async () => {
    const result = await highlightAsync(createCodePlugin(), "IDENTIFICATION DIVISION.", "cobol");
    expect(result.tokens[0].map((token) => token.content).join("")).toBe(
      "IDENTIFICATION DIVISION."
    );
  });
});
