import ts from "typescript";
import type { Offender } from "./types";

/**
 * How a finding is named and keyed. `offenderKey` is the string the ratchet
 * allowlist stores, so its shape is load-bearing: change it and every entry in
 * KNOWN_OFFENDERS silently stops matching.
 */

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
