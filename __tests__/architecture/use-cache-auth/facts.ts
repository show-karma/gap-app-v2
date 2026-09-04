import ts from "typescript";
import { unwrapToFunction } from "./directives";
import type { FileFacts } from "./types";

/**
 * Parses one file into the facts the walk needs: its function-like declarations,
 * object literals used as service objects, imports, and re-exports.
 *
 * No type checker and no `ts.Program` — `createSourceFile` plus hand resolution,
 * which is what keeps the guard fast enough to run as a unit test.
 */

export function collectFacts(path: string, text: string): FileFacts {
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
