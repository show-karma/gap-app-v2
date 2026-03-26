/**
 * @file Verifies dialog components in ProjectProfileLayout use dynamic imports
 */
import fs from "node:fs";
import path from "node:path";

const sourceFilePath = path.resolve(
  __dirname,
  "../../components/Pages/Project/v2/Layout/ProjectProfileLayout.tsx"
);
const sourceCode = fs.readFileSync(sourceFilePath, "utf-8");

describe("ProjectProfileLayout - Dynamic Imports", () => {
  it("should not have a static import for ProgressDialog", () => {
    expect(sourceCode).not.toMatch(/^import\s.*ProgressDialog.*from/m);
  });

  it("should not have a static import for EndorsementDialog", () => {
    expect(sourceCode).not.toMatch(/^import\s.*EndorsementDialog.*from/m);
  });

  it("should not have a static import for IntroDialog", () => {
    expect(sourceCode).not.toMatch(/^import\s.*IntroDialog.*from/m);
  });

  it("should not have a static import for EndorsementsListDialog", () => {
    expect(sourceCode).not.toMatch(/^import\s.*EndorsementsListDialog.*from/m);
  });

  it("should not have a static import for ProjectOptionsDialogs or ProjectOptionsMenu", () => {
    expect(sourceCode).not.toMatch(/^import\s.*ProjectOptionsDialogs.*from/m);
    expect(sourceCode).not.toMatch(/^import\s.*ProjectOptionsMenu.*from/m);
  });

  it("should use dynamic() for all dialog components", () => {
    const dialogs = [
      "ProgressDialog",
      "EndorsementDialog",
      "IntroDialog",
      "EndorsementsListDialog",
      "ProjectOptionsDialogs",
      "ProjectOptionsMenu",
    ];
    for (const name of dialogs) {
      expect(sourceCode).toMatch(new RegExp("dynamic\\([\\s\\S]*?" + name));
    }
  });

  it("should set ssr: false for all dynamic imports", () => {
    const dynamicCalls = sourceCode.match(/\bdynamic\(/g);
    const ssrFalse = sourceCode.match(/ssr:\s*false/g);
    expect(dynamicCalls?.length).toBe(ssrFalse?.length);
  });
});
