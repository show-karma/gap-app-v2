import {
  escapeRegexLiteral,
  makeLatin1,
  nonLatin1Positions,
} from "../../../scripts/build-worker-bundle.mjs";

// The Cloudflare Worker must stay Latin-1: one character above U+00FF makes V8
// store the whole ~57 Mi-character source as UTF-16 and pushes the isolate
// past its 128 MiB limit (docs/cloudflare-opennext-feasibility.md).

/** Evaluates a module-free expression and returns its value. */
function evaluate(expression: string): unknown {
  return new Function(`return (${expression});`)();
}

describe("escapeRegexLiteral", () => {
  it("escapes characters above U+00FF and keeps Latin-1 ones", () => {
    expect(escapeRegexLiteral("/Функция|é/")).toBe(
      "/\\u0424\\u0443\\u043D\\u043A\\u0446\\u0438\\u044F|é/"
    );
  });

  it("matches the same text before and after, with and without the u flag", () => {
    for (const literal of ["/(背景|Предыстория)/", "/[⍝#].*$/", "/^Ⅻ+$/u", "/[−×÷]/g"]) {
      const before = evaluate(literal) as RegExp;
      const after = evaluate(escapeRegexLiteral(literal)) as RegExp;
      for (const input of ["背景", "Предыстория", "⍝ x", "#x", "ⅫⅫ", "−", "plain"]) {
        expect(after.test(input)).toBe(before.test(input));
        before.lastIndex = 0;
        after.lastIndex = 0;
      }
    }
  });

  it("writes an astral character as a surrogate pair that a u regex reads as one code point", () => {
    const escaped = escapeRegexLiteral("/^😀$/u");
    expect(nonLatin1Positions(escaped)).toEqual([]);
    expect((evaluate(escaped) as RegExp).test("😀")).toBe(true);
  });

  it("drops the backslash of an identity escape instead of escaping it", () => {
    const escaped = escapeRegexLiteral("/a\\ф/");
    expect(escaped).toBe("/a\\u0444/");
    expect((evaluate(escaped) as RegExp).test("aф")).toBe(true);
  });

  it("keeps an escaped backslash in front of the character", () => {
    const escaped = escapeRegexLiteral("/\\\\ф/");
    expect((evaluate(escaped) as RegExp).test("\\ф")).toBe(true);
  });
});

describe("makeLatin1", () => {
  it("escapes regex literals and comments and leaves the rest of the code alone", () => {
    const source = 'const a = /Тест/; /* комментарий */ const b = "x" / 2; export { a, b };';
    const { source: out, escaped } = makeLatin1(source);
    expect(nonLatin1Positions(out)).toEqual([]);
    expect(escaped).toBe(15);
    expect(out).toContain('const b = "x" / 2');
  });

  it("is a no-op for a source that is already Latin-1", () => {
    const source = "export const r = /café/;";
    expect(makeLatin1(source)).toEqual({ source, escaped: 0 });
  });

  it("refuses non-Latin-1 text outside regexes, such as a tagged template's raw string", () => {
    expect(() => makeLatin1("export const t = String.raw`背景`;")).toThrow(
      /2 characters above U\+00FF are left outside regex literals/
    );
  });
});
