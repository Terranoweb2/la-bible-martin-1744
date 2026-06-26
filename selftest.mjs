/* Run the page's built-in self-tests under Node with a minimal DOM shim.
   This executes the REAL injected index.html script (including the embedded
   corpus) and triggers runSelfTests() via location.search="?test". */
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");

const islandMatch = html.match(/<script type="application\/json" id="bible-embedded">([\s\S]*?)<\/script>/);
const island = islandMatch[1];
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const mainScript = scripts[scripts.length - 1][1];

/* Universal no-op DOM node: any property is a function returning another node;
   style/classList/dataset are sub-objects; primitive-ish reads return defaults. */
function makeNode() {
  const style = new Proxy({}, { get: () => () => {}, set: () => true });
  const classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
  const dataset = {};
  return new Proxy(function () {}, {
    apply() { return makeNode(); },
    get(_t, prop) {
      if (prop === "style") return style;
      if (prop === "classList") return classList;
      if (prop === "dataset") return dataset;
      if (prop === "textContent" || prop === "innerHTML" || prop === "value") return "";
      if (prop === "hidden" || prop === "disabled" || prop === "checked") return false;
      if (prop === "scrollTop") return 0;
      if (prop === "id") return "bible-embedded";
      if (prop === Symbol.toPrimitive) return () => "";
      return () => makeNode();
    },
    set() { return true; },
  });
}

const embeddedEl = { textContent: island, trim: () => island };
const document = {
  getElementById: (id) => (id === "bible-embedded" ? embeddedEl : makeNode()),
  createElement: () => makeNode(),
  createDocumentFragment: () => makeNode(),
  querySelector: () => makeNode(),
  querySelectorAll: () => [],
  addEventListener: () => {},
  documentElement: makeNode(),
  body: makeNode(),
  get title() { return ""; },
  set title(_v) {},
  get activeElement() { return null; },
};

const _ls = new Map();
const localStorage = {
  getItem: (k) => (_ls.has(k) ? _ls.get(k) : null),
  setItem: (k, v) => { _ls.set(k, String(v)); },
  removeItem: (k) => { _ls.delete(k); },
};

const sandbox = {
  console,
  document,
  localStorage,
  navigator: { onLine: true },
  location: { search: "?test", href: "http://localhost/index.html?test" },
  window: {},
  CSS: { escape: (s) => s },
  URLSearchParams,
  setTimeout, clearTimeout, fetch: () => Promise.reject(new Error("no network in test")),
  AbortController,
  addEventListener: () => {}, removeEventListener: () => {},
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
let failed = 0;
const origError = console.error.bind(console);
console.error = (...a) => { if (String(a[0]).startsWith("✗")) failed++; origError(...a); };

vm.runInContext(mainScript, sandbox, { filename: "index.html#main" });

setTimeout(() => {
  console.error = origError;
  console.log("\n=== Harness verdict:", failed ? ("❌ " + failed + " test(s) échoué(s)") : "✅ tous les tests passent", "===");
  process.exit(failed ? 1 : 0);
}, 500);
