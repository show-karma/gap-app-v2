import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import ts from "typescript";
import {
  argumentsPassAnonymous,
  classifyOptionsArgument,
  hasUseCacheDirective,
  unwrapToFunction,
} from "./directives";
import { collectFacts } from "./facts";
import { namedOwner } from "./reporting";
import type { AnalysisResult, AnalyzerOptions, ApiCallSite, FileFacts, Offender } from "./types";
import {
  API_METHOD_OPTIONS_INDEX,
  DEFAULT_SOURCE_DIRS,
  SKIP_DIRECTORIES,
  SOURCE_EXTENSIONS,
  toPosix,
} from "./types";

/**
 * Static analysis behind the D2 cache-poisoning guard.
 *
 * The question it answers: starting from every `"use cache"` function in the
 * repo, can control reach an `api.*` call that has not dropped the auth token?
 *
 * That matters because `api.get` defaults `isAuthorized` to true, which on the
 * server routes through `TokenManager.getServerToken()` → a dynamic import of
 * `next/headers` → `cookies()`. Inside a `"use cache"` scope that is two
 * failures at once: `cookies()` is request state the cache cannot contain, and
 * a response built with somebody's token would be stored and then served to
 * everyone.
 *
 * Why transitively rather than a grep: the loader that failed the hub is three
 * hops from its cached entry point —
 * `getCommunityCategoriesCached` (`"use cache"`) → `getCommunityCategories`
 * (a React `cache()` wrapper) → `getCommunityCategoriesOrThrow` → `api.get`
 * with no options. Nothing about the cached function's own body is wrong; the
 * whole defect lives in what it can reach.
 *
 * No type checker and no `ts.Program`: this parses each file with
 * `createSourceFile` and resolves names by hand. It is fast enough to run in a
 * unit test, and the resolution it does do is deliberately conservative — an
 * `api.*` call it cannot prove is guarded is reported, not ignored. A guard
 * that errs toward silence is worth nothing.
 */

/**
 * The module surface is unchanged: `use-cache-auth.test.ts` imports
 * `hasUseCacheDirective`, `classifyOptionsArgument`, `createAnalyzer` and
 * `offenderKey` from this path and does not know the implementation moved.
 * The split exists because this file crossed the 600-line limit for
 * non-test `.ts` files; the walk below is what stayed.
 */
export {
  argumentsPassAnonymous,
  classifyOptionsArgument,
  hasUseCacheDirective,
} from "./directives";
export { namedOwner, offenderKey } from "./reporting";
export type { AnalysisResult, AnalyzerOptions, ApiCallSite, Offender } from "./types";
export { DEFAULT_SOURCE_DIRS } from "./types";

export function createAnalyzer(options: AnalyzerOptions) {
  const {
    rootDir,
    sourceDirs = DEFAULT_SOURCE_DIRS,
    readFile = (path: string) => readFileSync(path, "utf8"),
    fileExists = (path: string) => existsSync(path),
    listDir = (path: string) =>
      readdirSync(path, { withFileTypes: true }).map((entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
      })),
    maxDepth = 12,
  } = options;

  const cache = new Map<string, FileFacts | null>();

  const rel = (path: string) => toPosix(path).replace(`${toPosix(rootDir)}/`, "");

  function factsFor(path: string): FileFacts | null {
    const key = toPosix(path);
    if (cache.has(key)) return cache.get(key) ?? null;
    let facts: FileFacts | null = null;
    try {
      facts = collectFacts(path, readFile(path));
    } catch {
      facts = null;
    }
    cache.set(key, facts);
    return facts;
  }

  /** `@/x` and relative specifiers only; anything else is a package and ends the walk. */
  function resolveModule(specifier: string, fromFile: string): string | null {
    let base: string;
    if (specifier.startsWith("@/")) {
      base = join(rootDir, specifier.slice(2));
    } else if (specifier.startsWith(".")) {
      base = resolvePath(dirname(fromFile), specifier);
    } else {
      return null;
    }

    for (const extension of SOURCE_EXTENSIONS) {
      const candidate = `${base}${extension}`;
      if (fileExists(candidate)) return candidate;
    }
    for (const extension of SOURCE_EXTENSIONS) {
      const candidate = join(base, `index${extension}`);
      if (fileExists(candidate)) return candidate;
    }
    return null;
  }

  function listSourceFiles(): string[] {
    const found: string[] = [];
    const walk = (dir: string) => {
      let entries: Array<{ name: string; isDirectory: boolean }>;
      try {
        entries = listDir(dir);
      } catch {
        return;
      }
      for (const entry of entries) {
        if (SKIP_DIRECTORIES.has(entry.name)) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory) {
          walk(full);
        } else if (SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
          found.push(full);
        }
      }
    };
    for (const dir of sourceDirs) {
      const full = join(rootDir, dir);
      if (fileExists(full)) walk(full);
    }
    return found;
  }

  /** Find `name` as a function in `file`, following one hop of `export … from`. */
  function lookupFunction(
    file: string,
    name: string,
    seen = new Set<string>()
  ): { file: string; node: ts.Node; facts: FileFacts } | null {
    const key = `${toPosix(file)}#${name}`;
    if (seen.has(key)) return null;
    seen.add(key);

    const facts = factsFor(file);
    if (!facts) return null;

    const local = facts.functions.get(name);
    if (local) return { file, node: local as unknown as ts.Node, facts };

    const imported = facts.imports.get(name);
    if (imported) {
      const target = resolveModule(imported.module, file);
      if (target) return lookupFunction(target, imported.imported, seen);
    }

    const reExport = facts.reExports.find((entry) => entry.local === name);
    if (reExport) {
      const target = resolveModule(reExport.module, file);
      if (target) return lookupFunction(target, reExport.imported, seen);
    }

    return null;
  }

  function lineOf(facts: FileFacts, node: ts.Node): number {
    return facts.source.getLineAndCharacterOfPosition(node.getStart(facts.source)).line + 1;
  }

  /** Depth-first walk of one function body, collecting unguarded `api.*` calls. */
  function walk(
    file: string,
    node: ts.Node,
    facts: FileFacts,
    chain: string[],
    visited: Set<string>,
    depth: number,
    offenders: ApiCallSite[],
    chains: string[][],
    anonymousFromCaller: boolean
  ): void {
    if (depth > maxDepth) return;

    const visit = (current: ts.Node) => {
      if (ts.isCallExpression(current)) {
        const callee = current.expression;

        // api.<method>(…)
        if (
          ts.isPropertyAccessExpression(callee) &&
          ts.isIdentifier(callee.expression) &&
          callee.expression.text === "api" &&
          facts.imports.has("api")
        ) {
          const method = callee.name.text;
          const index = API_METHOD_OPTIONS_INDEX[method];
          if (index !== undefined) {
            const { guarded, reason } = classifyOptionsArgument(current.arguments[index], {
              anonymousFromCaller,
            });
            if (!guarded) {
              offenders.push({
                file: rel(file),
                line: lineOf(facts, current),
                method,
                reason,
                snippet: current.getText(facts.source).split("\n")[0].slice(0, 120),
              });
              chains.push([...chain]);
            }
          }
        }

        // A plain call we might be able to follow.
        if (ts.isIdentifier(callee)) {
          const target = lookupFunction(file, callee.text);
          if (target) {
            const key = `${toPosix(target.file)}#${callee.text}`;
            if (!visited.has(key)) {
              visited.add(key);
              const body = (target.node as ts.FunctionLikeDeclaration).body;
              if (body) {
                walk(
                  target.file,
                  body,
                  target.facts,
                  [...chain, callee.text],
                  visited,
                  depth + 1,
                  offenders,
                  chains,
                  argumentsPassAnonymous(current.arguments)
                );
              }
            }
          }
        }

        // service.method(…) where `service` is a local or imported object literal.
        if (
          ts.isPropertyAccessExpression(callee) &&
          ts.isIdentifier(callee.expression) &&
          callee.expression.text !== "api"
        ) {
          const holderName = callee.expression.text;
          const methodName = callee.name.text;
          const holderFacts =
            facts.objects.get(holderName) !== undefined
              ? { file, facts, object: facts.objects.get(holderName) as ts.ObjectLiteralExpression }
              : resolveImportedObject(file, facts, holderName);

          if (holderFacts) {
            for (const property of holderFacts.object.properties) {
              const propertyName =
                ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property)
                  ? ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
                    ? property.name.text
                    : null
                  : null;
              if (propertyName !== methodName) continue;

              const fn = ts.isMethodDeclaration(property)
                ? property
                : (unwrapToFunction((property as ts.PropertyAssignment).initializer) as
                    | ts.FunctionLikeDeclaration
                    | undefined);
              const key = `${toPosix(holderFacts.file)}#${holderName}.${methodName}`;
              if (fn?.body && !visited.has(key)) {
                visited.add(key);
                walk(
                  holderFacts.file,
                  fn.body,
                  holderFacts.facts,
                  [...chain, `${holderName}.${methodName}`],
                  visited,
                  depth + 1,
                  offenders,
                  chains,
                  argumentsPassAnonymous(current.arguments)
                );
              }
            }
          }
        }
      }

      ts.forEachChild(current, visit);
    };

    // `visit(node)`, not `forEachChild(node, visit)`: a concise arrow body IS the
    // call expression (`const load = async () => api.get("/x")`), and walking only
    // its children would step straight past the one node that matters.
    visit(node);
  }

  function resolveImportedObject(
    file: string,
    facts: FileFacts,
    name: string
  ): { file: string; facts: FileFacts; object: ts.ObjectLiteralExpression } | null {
    const imported = facts.imports.get(name);
    if (!imported) return null;
    const target = resolveModule(imported.module, file);
    if (!target) return null;
    const targetFacts = factsFor(target);
    const object = targetFacts?.objects.get(imported.imported);
    if (!targetFacts || !object) return null;
    return { file: target, facts: targetFacts, object };
  }

  function analyze(): AnalysisResult {
    const files = listSourceFiles();
    const entryPoints: AnalysisResult["entryPoints"] = [];
    const offenders: Offender[] = [];

    for (const file of files) {
      const facts = factsFor(file);
      if (!facts) continue;

      const visitTop = (node: ts.Node) => {
        const fn = node as ts.FunctionLikeDeclaration;
        const isFunctionLike =
          ts.isFunctionDeclaration(node) ||
          ts.isFunctionExpression(node) ||
          ts.isArrowFunction(node) ||
          ts.isMethodDeclaration(node);

        if (isFunctionLike && hasUseCacheDirective(fn.body)) {
          const name = namedOwner(node) ?? "<anonymous>";
          entryPoints.push({ name, file: rel(file), line: lineOf(facts, node) });

          const found: ApiCallSite[] = [];
          const chains: string[][] = [];
          if (fn.body) {
            walk(
              file,
              fn.body,
              facts,
              [name],
              new Set([`${toPosix(file)}#${name}`]),
              0,
              found,
              chains,
              false
            );
          }
          found.forEach((call, index) => {
            offenders.push({
              entry: name,
              entryFile: rel(file),
              path: chains[index] ?? [name],
              call,
            });
          });
        }

        ts.forEachChild(node, visitTop);
      };

      ts.forEachChild(facts.source, visitTop);
    }

    return { entryPoints, offenders, filesParsed: cache.size };
  }

  return { analyze, listSourceFiles, resolveModule, lookupFunction };
}
