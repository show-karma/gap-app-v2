import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  chunkBody,
  dedupeChunks,
  relativeRequire,
} from "../../../scripts/dedupe-server-chunks.mjs";

// Turbopack writes the same server chunk under several names; the Cloudflare
// build keeps one copy and makes the others re-export it.

const CHUNK = 'module.exports=[101,a=>{"use strict";a.s(["x",0,1],202)}];';

describe("chunkBody", () => {
  it("drops the trailing source map comment", () => {
    expect(chunkBody(`${CHUNK}\n\n//# sourceMappingURL=a._.js.map\n`)).toBe(`${CHUNK}\n`);
  });

  it("returns null for a file that is not a plain chunk", () => {
    expect(chunkBody('var RUNTIME_PUBLIC_PATH="server/chunks/";')).toBeNull();
  });
});

describe("relativeRequire", () => {
  it("is relative within a directory and across directories", () => {
    expect(relativeRequire("/c/ssr/b._.js", "/c/ssr/a._.js")).toBe("./a._.js");
    expect(relativeRequire("/c/ssr/b._.js", "/c/a._.js")).toBe("../a._.js");
    expect(relativeRequire("/c/b._.js", "/c/ssr/a._.js")).toBe("./ssr/a._.js");
  });
});

describe("dedupeChunks", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "chunks-"));
    mkdirSync(path.join(dir, "ssr"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const write = (name: string, content: string) => writeFileSync(path.join(dir, name), content);
  const read = (name: string) => readFileSync(path.join(dir, name), "utf8");

  it("keeps the first copy and makes copies that differ only in their map comment re-export it", () => {
    write("ssr/b._.js", `${CHUNK}\n\n//# sourceMappingURL=b._.js.map`);
    write("ssr/a._.js", `${CHUNK}\n\n//# sourceMappingURL=a._.js.map`);
    write("z._.js", `${CHUNK}\n\n//# sourceMappingURL=z._.js.map`);
    write("ssr/other._.js", "module.exports=[303,a=>{}];");

    const result = dedupeChunks(dir);

    expect(result.copies).toBe(2);
    expect(read("z._.js")).toContain('module.exports=require("./ssr/a._.js");');
    expect(read("ssr/b._.js")).toContain('module.exports=require("./a._.js");');
    expect(read("ssr/a._.js")).toBe(`${CHUNK}\n\n//# sourceMappingURL=a._.js.map`);
    expect(read("ssr/other._.js")).toBe("module.exports=[303,a=>{}];");
  });

  it("gives every copy the same module list as the kept chunk", () => {
    write("ssr/a._.js", `${CHUNK}\n//# sourceMappingURL=a._.js.map`);
    write("ssr/b._.js", `${CHUNK}\n//# sourceMappingURL=b._.js.map`);
    dedupeChunks(dir);
    const load = createRequire(path.join(dir, "index.js"));
    const kept = load("./ssr/a._.js");
    expect(load("./ssr/b._.js")).toBe(kept);
    expect(kept[0]).toBe(101);
  });

  it("leaves files that are not chunks alone, even when identical", () => {
    const runtime = 'var RUNTIME_PUBLIC_PATH="server/chunks/";';
    write("ssr/[turbopack]_runtime.js", runtime);
    write("ssr/runtime-copy.js", runtime);
    expect(dedupeChunks(dir).copies).toBe(0);
    expect(read("ssr/runtime-copy.js")).toBe(runtime);
  });
});
