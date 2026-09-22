import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Guards the contract between `styles/__theme_colors.scss` and the `primary`
 * ramp in `tailwind.config.js`. It has been broken twice, silently, because
 * an invalid colour function is dropped by the browser rather than reported:
 *
 *   1. The config read the RGB triplets through `hsl()`, so every numbered
 *      shade painted nothing at all.
 *   2. The config read them through `rgb()` with no alpha slot, so plain
 *      shades worked but every opacity modifier (`bg-primary-900/30`, the
 *      selected-row tint, `focus:ring-primary-500/20`) still painted nothing:
 *      Tailwind substitutes the alpha INTO the function, and CSS forbids
 *      mixing the legacy comma form with a `/` alpha.
 *
 * Both halves have to hold together, so both are asserted here.
 */
describe("primary colour ramp", () => {
  const root = path.resolve(__dirname, "../../..");
  const scss = fs.readFileSync(path.join(root, "styles/__theme_colors.scss"), "utf-8");
  const config = fs.readFileSync(path.join(root, "tailwind.config.js"), "utf-8");

  /**
   * Every `--c-*` channel declaration, one per line. Commented-out palettes
   * count: this file ships an alternate palette behind `//`, and uncommenting
   * a comma-separated one would reintroduce the bug, so the format assertion
   * has to cover them too. `active` marks the ones actually in effect.
   */
  const declarations = scss
    .split("\n")
    .map((line) => ({ line: line.trim(), match: /(--c-[a-z]+-\d+):\s*([^;]+);/.exec(line) }))
    .filter((entry): entry is { line: string; match: RegExpExecArray } => entry.match !== null)
    .map((entry) => ({
      name: entry.match[1],
      value: entry.match[2].trim(),
      active: !entry.line.startsWith("//"),
    }));

  it("declares channel triplets the scss file actually has", () => {
    expect(declarations.length).toBeGreaterThan(0);
  });

  it.each(declarations.map((d) => [d.name, d.value]))(
    "%s is space-separated, so it can take a `/ <alpha>`",
    (name, value) => {
      // A comma anywhere here makes `rgb(var(...) / 0.3)` invalid CSS.
      expect(value).not.toContain(",");
      expect(value).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
    }
  );

  const shades = [...config.matchAll(/(\d+): "(rgb\(var\(--c-primary-\d+\)[^"]*)"/g)].map(
    (match) => ({ shade: match[1], value: match[2] })
  );

  it("maps the numbered shades onto the scss variables", () => {
    expect(shades.length).toBe(10);
  });

  it.each(shades.map((s) => [s.shade, s.value]))(
    "primary.%s carries an <alpha-value> slot",
    (_shade, value) => {
      expect(value).toContain("<alpha-value>");
    }
  );

  it("produces a valid colour once Tailwind substitutes an opacity modifier", () => {
    const channels = declarations.find((d) => d.active && d.name === "--c-primary-900")?.value;
    const template = shades.find((s) => s.shade === "900")?.value;
    expect(channels).toBeDefined();
    expect(template).toBeDefined();

    // What the browser sees for `bg-primary-900/30`.
    const substituted = (template as string)
      .replace("var(--c-primary-900)", channels as string)
      .replace("<alpha-value>", "0.3");

    expect(substituted).toMatch(/^rgb\(\d{1,3} \d{1,3} \d{1,3} \/ 0\.3\)$/);
    // The mixed form that silently painted nothing.
    expect(substituted).not.toMatch(/\d,\s*\d.*\//);
  });
});
