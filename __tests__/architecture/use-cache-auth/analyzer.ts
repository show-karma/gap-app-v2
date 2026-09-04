import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import ts from "typescript";

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

/** Which argument carries `RequestOptions` for each method on the client. */
const API_METHOD_OPTIONS_INDEX: Readonly<Record<string, number>> = {
  get: 1,
  delete: 1,
  getPaginated: 1,
  post: 2,
  put: 2,
  patch: 2,
};

const SOURCE_EXTENSIONS = [".ts", ".tsx"] as const;

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

const SKIP_DIRECTORIES = new Set([
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

interface FileFacts {
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

const toPosix = (value: string) => value.split("\\").join("/");

/** True when the first statements of a body carry the `"use cache"` directive. */
export function hasUseCacheDirective(body: ts.Node | undefined): boolean {
  if (!body || !ts.isBlock(body)) return false;
  for (const statement of body.statements) {
    if (!ts.isExpressionStatement(statement)) break;
    const expression = statement.expression;
    if (!ts.isStringLiteral(expression) && !ts.isNoSubstitutionTemplateLiteral(expression)) break;
    if (expression.text === "use cache") return true;
  }
  return false;
}

/**
 * The options argument of an `api.*` call, judged statically.
 *
 * Guarded means one of exactly two shapes, both of which are provably
 * anonymous on the server: `publicReadOptions()` (which returns
 * `isAuthorized: typeof window !== "undefined"`), or a literal
 * `{ isAuthorized: false }`.
 *
 * There is one more accepted shape, and it is the common one in this repo:
 * `{ isAuthorized, signal }` where `isAuthorized` is forwarded from the
 * function's own options parameter. That is only anonymous if the caller made
 * it so, which is why it is judged with `anonymousFromCaller` — true when the
 * call that led here passed a literal `isAuthorized: false` down. So
 * `getProjectGrants(id, { isAuthorized: false })` is accepted and
 * `getProjectGrants(id)` (whose default is `true`) is not.
 *
 * Anything else — a spread, a bare variable, a conditional — is reported. Not
 * because it is necessarily wrong, but because this gate exists to make the
 * auth posture of a cached read obvious, and a posture that needs a human to
 * trace is exactly what let the hub regression through.
 */
export function classifyOptionsArgument(
  argument: ts.Expression | undefined,
  { anonymousFromCaller = false }: { anonymousFromCaller?: boolean } = {}
): {
  guarded: boolean;
  reason: ApiCallSite["reason"];
} {
  if (!argument) return { guarded: false, reason: "no-options" };

  if (ts.isCallExpression(argument)) {
    const callee = argument.expression;
    if (ts.isIdentifier(callee) && callee.text === "publicReadOptions") {
      return { guarded: true, reason: "no-options" };
    }
  }

  if (ts.isObjectLiteralExpression(argument)) {
    for (const property of argument.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const name = property.name;
      const key = ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
      if (key === "isAuthorized" && property.initializer.kind === ts.SyntaxKind.FalseKeyword) {
        return { guarded: true, reason: "no-options" };
      }
      // `{ isAuthorized: isAuthorized }` — the long form of the forward below.
      if (
        key === "isAuthorized" &&
        ts.isIdentifier(property.initializer) &&
        property.initializer.text === "isAuthorized" &&
        anonymousFromCaller
      ) {
        return { guarded: true, reason: "no-options" };
      }
    }
    for (const property of argument.properties) {
      if (!ts.isShorthandPropertyAssignment(property)) continue;
      if (property.name.text === "isAuthorized" && anonymousFromCaller) {
        return { guarded: true, reason: "no-options" };
      }
    }
  }

  return { guarded: false, reason: "not-statically-guarded" };
}

/**
 * True when a call passes a literal `{ isAuthorized: false }` in any argument.
 *
 * That is how the cached wrappers in `services/project.cached.ts` make an
 * otherwise caller-dependent loader anonymous, so the walk has to carry the
 * fact down or it reports safe code as debt.
 */
export function argumentsPassAnonymous(args: ts.NodeArray<ts.Expression>): boolean {
  for (const argument of args) {
    if (!ts.isObjectLiteralExpression(argument)) continue;
    for (const property of argument.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const name = property.name;
      const key = ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
      if (key === "isAuthorized" && property.initializer.kind === ts.SyntaxKind.FalseKeyword) {
        return true;
      }
    }
  }
  return false;
}

function unwrapToFunction(node: ts.Node | undefined): ts.Node | undefined {
  if (!node) return undefined;
  if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
    return node;
  }
  // `cache(async () => {})`, `memo(fn)`, and friends: look one level in.
  if (ts.isCallExpression(node)) {
    for (const argument of node.arguments) {
      const inner = unwrapToFunction(argument);
      if (inner) return inner;
    }
  }
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) {
    return unwrapToFunction(node.expression);
  }
  return undefined;
}

function collectFacts(path: string, text: string): FileFacts {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const facts: FileFacts = {
    path,
    source,
    functions: new Map(),
    objects: new Map(),
    imports: new Map(),
    reExports: [],
  };

  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const module = statement.moduleSpecifier.text;
      const bindings = statement.importClause?.namedBindings;
      if (statement.importClause?.name) {
        facts.imports.set(statement.importClause.name.text, { module, imported: "default" });
      }
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          facts.imports.set(element.name.text, {
            module,
            imported: (element.propertyName ?? element.name).text,
          });
        }
      }
      continue;
    }

    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
      if (ts.isStringLiteral(statement.moduleSpecifier) && statement.exportClause) {
        if (ts.isNamedExports(statement.exportClause)) {
          for (const element of statement.exportClause.elements) {
            facts.reExports.push({
              module: statement.moduleSpecifier.text,
              imported: (element.propertyName ?? element.name).text,
              local: element.name.text,
            });
          }
        }
      }
      continue;
    }

    if (ts.isFunctionDeclaration(statement) && statement.name) {
      facts.functions.set(statement.name.text, statement);
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        const fn = unwrapToFunction(declaration.initializer);
        if (fn) {
          facts.functions.set(
            declaration.name.text,
            fn as FileFacts["functions"] extends Map<string, infer V> ? V : never
          );
          continue;
        }
        if (declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
          facts.objects.set(declaration.name.text, declaration.initializer);
        }
      }
    }
  }

  return facts;
}

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

/** Best-effort name for a function-like node: its own, or the const/property it is assigned to. */
export function namedOwner(node: ts.Node): string | null {
  const fn = node as ts.FunctionLikeDeclaration;
  if (fn.name && ts.isIdentifier(fn.name)) return fn.name.text;

  let parent: ts.Node | undefined = node.parent;
  while (parent) {
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
    if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
    if (
      ts.isCallExpression(parent) ||
      ts.isAsExpression(parent) ||
      ts.isParenthesizedExpression(parent)
    ) {
      parent = parent.parent;
      continue;
    }
    break;
  }
  return null;
}

/** Stable, human-readable key for the ratchet allowlist. */
export function offenderKey(offender: Offender): string {
  return `${offender.entryFile}#${offender.entry} -> ${offender.call.file}:${offender.call.method}`;
}
