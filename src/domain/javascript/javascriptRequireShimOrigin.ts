import * as t from "@babel/types";

import {
  isUnmodifiedCommonJsWrapperBinding,
  resolveSemanticBindingState,
  semanticResolutionBlocked,
  semanticStableInitializer,
  type JavaScriptSemanticAnalysisState,
  type JavaScriptSemanticBindingState,
} from "./javascriptSemanticState.js";
import {
  semanticMemberChain,
  type JavaScriptRequireOrigin,
} from "./javascriptSemanticRequireOrigin.js";
import { argumentValue } from "./javascriptStaticAnalysisHelpers.js";

const proofs = new WeakMap<
  JavaScriptSemanticAnalysisState,
  WeakMap<t.CallExpression, string | null>
>();

/**
 * Recover a literal require reached through esbuild's CommonJS `__require` shim.
 *
 * esbuild replaces `require` with an IIFE that selects the host `require` at
 * runtime and otherwise falls back to the passed function:
 *
 *   var Q = (e => typeof require < "u" ? require : typeof Proxy < "u"
 *     ? new Proxy(e, { get: (t, n) => (typeof require < "u" ? require : t)[n] })
 *     : e)(function (e) { ... });
 *
 * Minification then turns `require("electron")` into `Q("electron")`, which the
 * direct-require resolver cannot follow. The shim is accepted only when one
 * never-reassigned binding holds a flat IIFE whose arrow callee guards the
 * unshadowed global `require` behind its availability test, and is applied to a
 * fallback function. `Q("electron")` inside that scope is then the same literal
 * require. Syntax is proven, never inferred from the binding name, and a shim
 * that would always return its fallback is refused.
 */
export const semanticRequireShimOrigin = (
  node: t.Node | null | undefined,
  state: JavaScriptSemanticAnalysisState,
): JavaScriptRequireOrigin | undefined => {
  const chain = semanticMemberChain(node);
  const current = chain?.root;
  if (
    chain === undefined ||
    !t.isCallExpression(current) ||
    !t.isIdentifier(current.callee) ||
    current.arguments.length !== 1
  )
    return undefined;
  const specifier = argumentValue(current.arguments[0]);
  if (specifier === undefined) return undefined;
  const binding = resolveSemanticBindingState(
    state,
    current.callee,
    current.callee.name,
  );
  if (
    binding === undefined ||
    semanticResolutionBlocked(state, current.callee, current.callee.name) ||
    binding.definitions.length !== 1 ||
    binding.definitions[0]?.kind === "assignment" ||
    !bindsRequireShim(binding, state)
  )
    return undefined;
  return {
    origin: {
      specifier,
      importedPath: chain.members,
      resolutionMode: "require",
    },
    call: current,
  };
};

const bindsRequireShim = (
  binding: JavaScriptSemanticBindingState,
  state: JavaScriptSemanticAnalysisState,
): boolean => {
  const initializer = semanticStableInitializer(binding, state)?.node;
  if (initializer === undefined || !t.isCallExpression(initializer))
    return false;
  let byCall = proofs.get(state);
  if (byCall === undefined) {
    byCall = new WeakMap();
    proofs.set(state, byCall);
  }
  const cached = byCall.get(initializer);
  if (cached !== undefined) return cached === binding.bindingId;
  byCall.set(
    initializer,
    shimSelectsRequire(initializer, state) ? binding.bindingId : null,
  );
  return byCall.get(initializer) === binding.bindingId;
};

/**
 * A flat IIFE whose arrow callee guards the host `require` with its
 * availability and is applied to a fallback function. esbuild emits exactly
 * this shape, so the argument count and callee form are part of the proof.
 */
const shimSelectsRequire = (
  call: t.CallExpression,
  state: JavaScriptSemanticAnalysisState,
): boolean => {
  const callee = call.callee;
  if (
    (!t.isArrowFunctionExpression(callee) && !t.isFunctionExpression(callee)) ||
    callee.generator ||
    callee.async ||
    callee.params.length !== 1 ||
    !t.isIdentifier(callee.params[0]) ||
    call.arguments.length !== 1
  )
    return false;
  const body = t.isBlockStatement(callee.body) ? undefined : callee.body;
  return body !== undefined && selectsGlobalRequire(body, state);
};

/**
 * The expression yields the unshadowed global `require` on the branch its own
 * availability guard selects.
 *
 * esbuild reaches `require` only through its availability test and nests that
 * test for the Proxy fallback, so a nested conditional is followed only when
 * its own guard establishes the same availability. Any other condition, such
 * as a literal `false`, is refused: the shim would then always return the
 * fallback and never load the requested module.
 */
const selectsGlobalRequire = (
  expression: t.Expression,
  state: JavaScriptSemanticAnalysisState,
): boolean => {
  if (t.isConditionalExpression(expression)) {
    if (!guardsRequireAvailability(expression.test, state)) return false;
    return selectsGlobalRequire(expression.consequent, state);
  }
  return isGlobalRequire(expression, state);
};

/** The unshadowed global `require`, never a local or wrapper-owned binding. */
const isGlobalRequire = (
  node: t.Node,
  state: JavaScriptSemanticAnalysisState,
): boolean =>
  t.isIdentifier(node, { name: "require" }) &&
  (resolveSemanticBindingState(state, node, "require") === undefined
    ? !semanticResolutionBlocked(state, node, "require")
    : isUnmodifiedCommonJsWrapperBinding(node, "require", state));

/**
 * Whether `test` is the availability check for the host `require`. esbuild
 * emits `typeof require < "u"` after minification and `typeof require !==
 * "undefined"` before it; both are accepted, and nothing weaker, so a branch
 * reached under an unrelated condition is not treated as the host loader.
 */
const guardsRequireAvailability = (
  test: t.Expression,
  state: JavaScriptSemanticAnalysisState,
): boolean => {
  if (!t.isBinaryExpression(test)) return false;
  const testOnLeft = isTypeofRequire(test.left, state);
  const testOnRight = isTypeofRequire(test.right, state);
  if (testOnLeft === testOnRight) return false;
  const literal = readLiteralText(testOnLeft ? test.right : test.left);
  if (test.operator === "<") return testOnLeft && literal === "u";
  return (
    (test.operator === "!=" || test.operator === "!==") &&
    literal === "undefined"
  );
};

/** Whether this operand is `typeof require` for the unshadowed host `require`. */
const isTypeofRequire = (
  node: t.Node,
  state: JavaScriptSemanticAnalysisState,
): boolean =>
  t.isUnaryExpression(node, { operator: "typeof" }) &&
  isGlobalRequire(node.argument, state);

const readLiteralText = (node: t.Node): string | undefined =>
  t.isStringLiteral(node) ? node.value : undefined;
