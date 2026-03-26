import * as fs from "node:fs";
import * as path from "node:path";

describe("globals.css performance", () => {
  const globalsPath = path.resolve(__dirname, "../../styles/globals.css");
  const css = fs.readFileSync(globalsPath, "utf-8");

  it("should NOT apply transition-colors to all body descendants (causes style recalc on every element)", () => {
    const bodyStarTransition = /body\s*\*\s*\{[^}]*transition-colors[^}]*\}/;
    expect(css).not.toMatch(bodyStarTransition);
  });
});
