import ts from "typescript";

/**
 * The AST predicates the walk is built from: does a body opt into `"use cache"`,
 * is an `api.*` options argument provably token-free, and does a call hand an
 * anonymous read down to a callee.
 *
 * Each is deliberately conservative — anything it cannot prove is guarded is
 * reported. A guard that errs toward silence is worth nothing.
 */

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

export function unwrapToFunction(node: ts.Node | undefined): ts.Node | undefined {
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
