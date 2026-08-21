import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * `output: "standalone"` must be requested only by builds that consume it.
 *
 * It used to be unconditional, on the premise that Vercel ignored it. Next 16.3
 * broke that premise: the Vercel build adapter suppresses node-file-trace
 * manifest emission because it does its own tracing for the Lambda format, and
 * Next's standalone copier then reads `.next/next-server.js.nft.json` unguarded.
 * The build compiled, typechecked and prerendered, then died with ENOENT — on
 * preview deploys and equally on `vercel build --prod` in production.yml.
 *
 * So the invariant runs in both directions: next.config.ts must gate the option
 * behind NEXT_OUTPUT_STANDALONE, and every workflow step that later unpacks
 * `.next/standalone` must set it. A job that consumes the directory without
 * asking for it would fail at the copy step with an empty tree, which is a
 * slower and much less obvious failure than this test.
 */

const ROOT = join(__dirname, "..");
const STANDALONE_ENV_VAR = "NEXT_OUTPUT_STANDALONE";

const readRepoFile = (relativePath: string) => readFileSync(join(ROOT, relativePath), "utf8");

describe("standalone output gate", () => {
  it("does not request standalone output unconditionally", () => {
    const config = readRepoFile("next.config.ts");

    expect(config).not.toMatch(/^\s*output:\s*"standalone",/m);
    expect(config).toContain(
      `output: process.env.${STANDALONE_ENV_VAR} === "1" ? "standalone" : undefined,`
    );
  });

  it.each(["build-main.yml", "qa-pipeline.yml"])(
    "%s opts in, because it unpacks .next/standalone",
    (workflowFile) => {
      const workflow = readRepoFile(join(".github/workflows", workflowFile));

      expect(workflow).toContain(".next/standalone");
      expect(workflow).toContain(`${STANDALONE_ENV_VAR}: "1"`);
    }
  );

  it("is not opted into by the Vercel build command", () => {
    // vercel-build.sh backs both preview deploys and production.yml's
    // `vercel build --prod`; either setting the variable reintroduces the bug.
    expect(readRepoFile("vercel-build.sh")).not.toContain(STANDALONE_ENV_VAR);
    expect(readRepoFile(".github/workflows/production.yml")).not.toContain(STANDALONE_ENV_VAR);
  });
});
