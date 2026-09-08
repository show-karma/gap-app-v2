import type ts from "typescript";

/**
 * Shared vocabulary for the D2 cache-poisoning guard: the shape of a finding,
 * the knobs the analyzer takes, and the constants that decide what gets walked.
 *
 * See ./analyzer.ts for what the guard is for and why it walks transitively.
 */

/** Which argument carries `RequestOptions` for each method on the client. */
export const API_METHOD_OPTIONS_INDEX: Readonly<Record<string, number>> = {
  get: 1,
  delete: 1,
  getPaginated: 1,
  post: 2,
  put: 2,
  patch: 2,
};

export const SOURCE_EXTENSIONS = [".ts", ".tsx"] as const;

/** Directories that hold shippable source. Tests, mocks and build output are not walked. */
export const DEFAULT_SOURCE_DIRS = [
  "app",
  "components",
  "hooks",
  "services",
  "src",
  "utilities",
  "sanity",
] as const;

export const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  "__tests__",
  "__mocks__",
  "e2e",
  "artifacts",
  "storybook-static",
]);

export interface ApiCallSite {
  /** Repo-relative file holding the unguarded call. */
  file: string;
  line: number;
  method: string;
  /** Why it is reported — a missing options argument reads differently from an opaque one. */
  reason: "no-options" | "not-statically-guarded";
  snippet: string;
}

export interface Offender {
  /** The `"use cache"` function the walk started from. */
  entry: string;
  entryFile: string;
  /** Call chain from the entry point down to the offending call. */
  path: string[];
  call: ApiCallSite;
}

export interface AnalysisResult {
  entryPoints: Array<{ name: string; file: string; line: number }>;
  offenders: Offender[];
  /** Files the walk parsed — a sanity number, and a cheap way to spot a broken resolver. */
  filesParsed: number;
}

export interface FileFacts {
  path: string;
  source: ts.SourceFile;
  /** Local function-like declarations by exported/declared name. */
  functions: Map<string, ts.SignatureDeclarationBase & { body?: ts.Node }>;
  /** Local object literals assigned to a const, for `service.method()` calls. */
  objects: Map<string, ts.ObjectLiteralExpression>;
  /** Imported binding name -> where it came from. */
  imports: Map<string, { module: string; imported: string }>;
  /** `export { a } from "./b"` and `export * from "./b"`. */
  reExports: Array<{ module: string; imported: string; local: string }>;
}

export interface AnalyzerOptions {
  rootDir: string;
  sourceDirs?: readonly string[];
  /** Injected for fixture tests; defaults to the real filesystem. */
  readFile?: (path: string) => string;
  fileExists?: (path: string) => boolean;
  listDir?: (path: string) => Array<{ name: string; isDirectory: boolean }>;
  maxDepth?: number;
}

export const toPosix = (value: string) => value.split("\\").join("/");
