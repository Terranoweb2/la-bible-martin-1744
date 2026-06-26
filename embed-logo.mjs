/* ===========================================================================
   embed-logo.mjs — Inline ./logo.png into index.html as a base64 data URI,
   used for the sidebar crest and the favicon/apple-touch icon. Keeps the app
   single-file and fully offline. Idempotent: run again to refresh the logo.
     node embed-logo.mjs
   ========================================================================= */
import { readFileSync, writeFileSync } from "node:fs";

const here = (p) => new URL(p, import.meta.url);
const png = readFileSync(here("./logo.png"));
const uri = "data:image/png;base64," + png.toString("base64");

const file = here("./index.html");
let html = readFileSync(file, "utf8");

/* Fill these specific attributes whether they hold the placeholder or a previous
   data URI — makes re-embedding safe. */
const targets = [
  /(<link rel="icon" type="image\/png" href=")[^"]*(")/,
  /(<link rel="apple-touch-icon" href=")[^"]*(")/,
  /(<img class="crest" src=")[^"]*(")/,
];
let count = 0;
for (const re of targets) {
  if (re.test(html)) { html = html.replace(re, `$1${uri}$2`); count++; }
}
if (count !== targets.length) {
  console.error(`✗ Seulement ${count}/${targets.length} emplacements trouvés — vérifier index.html.`);
  process.exit(1);
}
writeFileSync(file, html);
console.log(`✓ Logo inliné dans ${count} emplacements (${(png.length / 1024).toFixed(0)} Ko → base64).`);
console.log(`✓ index.html : ${(Buffer.byteLength(html, "utf8") / 1e6).toFixed(2)} MB`);
