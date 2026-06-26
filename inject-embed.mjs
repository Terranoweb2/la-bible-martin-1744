/* ===========================================================================
   inject-embed.mjs — Inject the complete Martin 1744 dataset
   (data-martin.generated.json, produced by build-embed.mjs) into index.html as
   an inline JSON island: <script type="application/json" id="bible-embedded">.

   Idempotent: run it again to refresh the embedded data. Run with:
     node build-embed.mjs && node inject-embed.mjs
   ========================================================================= */
import { readFileSync, writeFileSync } from "node:fs";

const here = (p) => new URL(p, import.meta.url);

const json = readFileSync(here("./data-martin.generated.json"), "utf8");
JSON.parse(json); // fail fast if the dataset is corrupt

/* Escape '<' so the payload can never form a "</script>" (or "<!--") sequence
   that would terminate the host <script> early. '<' is valid JSON and
   JSON.parse() restores it to '<' in the browser. JSON structure uses no '<',
   so this only ever touches verse-text contents. */
const safe = json.replace(/</g, "\\u003c");

const island =
  '<script type="application/json" id="bible-embedded">\n' + safe + "\n</script>";

const file = here("./index.html");
let html = readFileSync(file, "utf8");

const placeholder = "<!-- BIBLE_EMBEDDED_DATA -->";
const existing = /<script type="application\/json" id="bible-embedded">[\s\S]*?<\/script>/;

if (existing.test(html)) {
  html = html.replace(existing, island);
  console.log("↻ Îlot de données remplacé (mise à jour).");
} else if (html.includes(placeholder)) {
  html = html.replace(placeholder, island);
  console.log("✓ Îlot de données injecté à l'emplacement réservé.");
} else {
  console.error("✗ Ni îlot existant ni placeholder '" + placeholder + "' trouvé dans index.html.");
  process.exit(1);
}

writeFileSync(file, html);
const mb = (Buffer.byteLength(html, "utf8") / 1e6).toFixed(2);
console.log("✓ index.html écrit — taille finale: " + mb + " MB");
