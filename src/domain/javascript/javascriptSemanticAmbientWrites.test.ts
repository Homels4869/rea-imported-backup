import { expect, it } from "vitest";

import { analyzeJavaScriptStaticSource } from "./javascriptStaticAnalysis.js";

it.each([
  {
    name: "reconverging projections with different alias-cycle histories",
    setup: `var x; const a = { foo: x, bar: globalThis }; x = a.bar;
const y = flag ? x : a.foo; y.URL = replacement;`,
    specifier: null,
  },
  {
    name: "growing self-reference projections with an ambient initializer",
    setup: `let alias = globalThis; alias = alias.globalThis;
alias.URL = replacement;`,
    specifier: null,
  },
  {
    name: "an ambient alias captured before its binding is replaced",
    setup: `let alias = globalThis; const box = { target: alias };
alias = {}; box.target.URL = replacement;`,
    specifier: null,
  },
  {
    name: "a local alias captured after its binding is replaced",
    setup: `let alias = globalThis; alias = {};
const box = { target: alias }; box.target.URL = replacement;`,
    specifier: "./worker.js",
  },
  {
    name: "growing ambient self-references across loop activations",
    setup: `let alias = globalThis;
while (flag) { alias = alias.globalThis; alias.URL = replacement; }`,
    specifier: null,
  },
  {
    name: "ambient writes across unordered callable activations",
    setup: `let alias = globalThis;
function patch() { alias.URL = replacement; } alias = {};`,
    specifier: null,
  },
  {
    name: "an ambient alias rebound before a public instance field runs",
    setup: `let alias = {};
class C { field = (alias.URL = replacement); }
alias = globalThis; new C();`,
    specifier: null,
  },
  {
    name: "an ambient alias rebound before a private instance field runs",
    setup: `let alias = {};
class C { #field = (alias.URL = replacement); }
alias = globalThis; new C();`,
    specifier: null,
  },
  {
    name: "a local alias written by an eager static field",
    setup: `let alias = {};
class C { static field = (alias.URL = replacement); }
alias = globalThis;`,
    specifier: "./worker.js",
  },
  {
    name: "a local alias written by an eager private static field",
    setup: `let alias = {};
class C { static #field = (alias.URL = replacement); }
alias = globalThis;`,
    specifier: "./worker.js",
  },
  {
    name: "a local alias written by an eager computed instance field key",
    setup: `let alias = {};
class C { [alias.URL = replacement] = 1; }
alias = globalThis; new C();`,
    specifier: "./worker.js",
  },
  {
    name: "distinct properties selecting both ambient identities",
    setup: `const box = { left: globalThis, right: import.meta };
const selected = flag ? box.left : box.right; selected.URL = replacement;`,
    specifier: null,
  },
  {
    name: "cyclic containers with a reachable ambient property",
    setup: `var alias; const box = { next: alias, target: import.meta };
alias = box; const selected = flag ? alias.target : alias.next.target;
selected.url = "file:///other/entry.mjs";`,
    specifier: null,
  },
  {
    name: "cycles containing no ambient identity",
    setup: `var box; box = { next: box };
const selected = flag ? box : box.next; selected.URL = replacement;`,
    specifier: "./worker.js",
  },
  {
    name: "unrelated writes through widened self-reference projections",
    setup: `let alias = globalThis; alias = alias.globalThis;
alias.unrelated = replacement;`,
    specifier: "./worker.js",
  },
  {
    name: "an exact empty projection into a shallow copy",
    setup: `const copy = { ...globalThis };
const selected = flag ? copy : copy; selected.URL = replacement;`,
    specifier: "./worker.js",
  },
])("preserves $name", ({ setup, specifier }) => {
  const source = `import { Worker } from "node:worker_threads";
${setup}
new Worker(new URL("./worker.js", import.meta.url));`;
  const worker = analyzeJavaScriptStaticSource(source).references.find(
    (reference) => reference.kind === "worker",
  );
  expect(worker?.specifier).toBe(specifier);
});
