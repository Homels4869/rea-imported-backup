import * as t from "@babel/types";
import { describe, expect, it } from "vitest";

import {
  semanticMutationInitializers,
  semanticReadInitializers,
} from "./javascriptSemanticMutationInitializers.js";
import type { JavaScriptSemanticBindingState } from "./javascriptSemanticState.js";
import { traverseJavaScriptAst } from "./javascriptSemanticTraversal.js";
import { parseJavaScriptSource } from "./javascriptSourceParser.js";

describe("parameter references copied into function body bindings", () => {
  it.each([
    ["var arg = []; mutate(arg);", false],
    ["mutate(arg); var arg = [];", true],
    ["if (flag) { var arg = []; } mutate(arg);", true],
  ])(
    "retains the entry reference only when still reachable: %s",
    (body, retained) => {
      const program = parseJavaScriptSource(
        `function result(arg = source) { ${body} }`,
      )?.program;
      const callable = program?.body[0];
      if (program === undefined || !t.isFunctionDeclaration(callable))
        throw new Error("Expected a parsed function declaration");
      const parameter = callable.params[0];
      if (!t.isAssignmentPattern(parameter) || !t.isIdentifier(parameter.left))
        throw new Error("Expected the source parameter binding");
      const parents = new WeakMap<t.Node, t.Node>();
      let replacement: t.Node | undefined;
      let mutation: t.Node | undefined;
      traverseJavaScriptAst(program, {
        enter: (node, parent) => {
          if (parent !== null) parents.set(node, parent);
          if (t.isVariableDeclarator(node) && node.init !== null)
            replacement = node.init;
          if (t.isCallExpression(node)) mutation = node;
        },
      });
      if (replacement === undefined || mutation === undefined)
        throw new Error("Expected a body initializer and subsequent effect");
      const entry = {
        node: parameter.left,
        projection: [],
        entryBody: callable.body,
      };
      const assigned = { node: replacement, projection: [] };
      const binding: JavaScriptSemanticBindingState = {
        bindingId: "body:arg",
        scopeId: "body",
        name: "arg",
        kind: "variable",
        declarationKinds: new Set(),
        mutable: true,
        memberWrites: [],
        escapedPaths: [],
        definitions: [],
        initializers: [entry, assigned],
        referenceInitializers: [],
        directOrigins: [],
        runtimeImport: false,
      };
      const origins = semanticMutationInitializers(binding, mutation, parents);
      expect(origins.initializers.includes(entry)).toBe(retained);
      expect(origins.initializers).toContain(assigned);
    },
  );
});

describe("class field alias activation snapshots", () => {
  it.each([
    ["public", false, false],
    ["private", false, false],
    ["accessor", false, false],
    ["public", true, false],
    ["private", true, false],
    ["accessor", true, false],
    ["public", false, true],
    ["accessor", false, true],
  ] as const)(
    "selects %s field reads with static=%s and computed key=%s",
    (kind, isStatic, computed) => {
      const read = t.identifier("alias");
      const initial = t.objectExpression([]);
      const later = t.identifier("globalThis");
      const key = computed ? read : t.identifier("field");
      const value = computed ? t.numericLiteral(1) : read;
      // Auto-accessors are a Babel AST contract even when the source parser
      // does not enable their proposal syntax.
      const field =
        kind === "private"
          ? t.classPrivateProperty(
              t.privateName(t.identifier("field")),
              value,
              null,
              isStatic,
            )
          : kind === "accessor"
            ? t.classAccessorProperty(
                key,
                value,
                null,
                null,
                computed,
                isStatic,
              )
            : t.classProperty(key, value, null, null, computed, isStatic);
      const program = t.program([
        t.variableDeclaration("let", [
          t.variableDeclarator(t.identifier("alias"), initial),
        ]),
        t.classDeclaration(t.identifier("C"), null, t.classBody([field])),
        t.expressionStatement(
          t.assignmentExpression("=", t.identifier("alias"), later),
        ),
      ]);
      const parents = new WeakMap<t.Node, t.Node>();
      traverseJavaScriptAst(program, {
        enter: (node, parent) => {
          if (parent !== null) parents.set(node, parent);
        },
      });
      const before = { node: initial, projection: [] };
      const after = { node: later, projection: [] };
      const binding: JavaScriptSemanticBindingState = {
        bindingId: "top:alias",
        scopeId: "top",
        name: "alias",
        kind: "variable",
        mutable: true,
        memberWrites: [],
        escapedPaths: [],
        definitions: [],
        initializers: [before, after],
        referenceInitializers: [],
        directOrigins: [],
        runtimeImport: false,
      };
      expect(
        semanticReadInitializers(binding, read, parents).initializers,
      ).toEqual(isStatic || computed ? [before] : [before, after]);
    },
  );
});
