/* ===========================================================================
   build-embed.mjs — Fetch the COMPLETE David Martin 1744 (66 books) from
   getbible.net and produce a compact, fully-offline dataset embedded into
   index.html. Run once (or to refresh) with: node build-embed.mjs

   Output: writes `data-martin.generated.json` (for inspection) and prints the
   gzip+base64 payload size. The actual injection into index.html is done by
   inject-embed.mjs which consumes data-martin.generated.json.
   ========================================================================= */
import { writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const API_BASE = "https://api.getbible.net/v2/martin";

/* 66-book canon with real chapter counts — MUST match BOOKS in index.html. */
const BOOKS = [
  { id: 1, name: "Genèse", ch: 50 }, { id: 2, name: "Exode", ch: 40 },
  { id: 3, name: "Lévitique", ch: 27 }, { id: 4, name: "Nombres", ch: 36 },
  { id: 5, name: "Deutéronome", ch: 34 }, { id: 6, name: "Josué", ch: 24 },
  { id: 7, name: "Juges", ch: 21 }, { id: 8, name: "Ruth", ch: 4 },
  { id: 9, name: "1 Samuel", ch: 31 }, { id: 10, name: "2 Samuel", ch: 24 },
  { id: 11, name: "1 Rois", ch: 22 }, { id: 12, name: "2 Rois", ch: 25 },
  { id: 13, name: "1 Chroniques", ch: 29 }, { id: 14, name: "2 Chroniques", ch: 36 },
  { id: 15, name: "Esdras", ch: 10 }, { id: 16, name: "Néhémie", ch: 13 },
  { id: 17, name: "Esther", ch: 10 }, { id: 18, name: "Job", ch: 42 },
  { id: 19, name: "Psaumes", ch: 150 }, { id: 20, name: "Proverbes", ch: 31 },
  { id: 21, name: "Ecclésiaste", ch: 12 }, { id: 22, name: "Cantique des Cantiques", ch: 8 },
  { id: 23, name: "Ésaïe", ch: 66 }, { id: 24, name: "Jérémie", ch: 52 },
  { id: 25, name: "Lamentations", ch: 5 }, { id: 26, name: "Ézéchiel", ch: 48 },
  { id: 27, name: "Daniel", ch: 12 }, { id: 28, name: "Osée", ch: 14 },
  { id: 29, name: "Joël", ch: 3 }, { id: 30, name: "Amos", ch: 9 },
  { id: 31, name: "Abdias", ch: 1 }, { id: 32, name: "Jonas", ch: 4 },
  { id: 33, name: "Michée", ch: 7 }, { id: 34, name: "Nahum", ch: 3 },
  { id: 35, name: "Habacuc", ch: 3 }, { id: 36, name: "Sophonie", ch: 3 },
  { id: 37, name: "Aggée", ch: 2 }, { id: 38, name: "Zacharie", ch: 14 },
  { id: 39, name: "Malachie", ch: 4 },
  { id: 40, name: "Matthieu", ch: 28 }, { id: 41, name: "Marc", ch: 16 },
  { id: 42, name: "Luc", ch: 24 }, { id: 43, name: "Jean", ch: 21 },
  { id: 44, name: "Actes", ch: 28 }, { id: 45, name: "Romains", ch: 16 },
  { id: 46, name: "1 Corinthiens", ch: 16 }, { id: 47, name: "2 Corinthiens", ch: 13 },
  { id: 48, name: "Galates", ch: 6 }, { id: 49, name: "Éphésiens", ch: 6 },
  { id: 50, name: "Philippiens", ch: 4 }, { id: 51, name: "Colossiens", ch: 4 },
  { id: 52, name: "1 Thessaloniciens", ch: 5 }, { id: 53, name: "2 Thessaloniciens", ch: 3 },
  { id: 54, name: "1 Timothée", ch: 6 }, { id: 55, name: "2 Timothée", ch: 4 },
  { id: 56, name: "Tite", ch: 3 }, { id: 57, name: "Philémon", ch: 1 },
  { id: 58, name: "Hébreux", ch: 13 }, { id: 59, name: "Jacques", ch: 5 },
  { id: 60, name: "1 Pierre", ch: 5 }, { id: 61, name: "2 Pierre", ch: 3 },
  { id: 62, name: "1 Jean", ch: 5 }, { id: 63, name: "2 Jean", ch: 1 },
  { id: 64, name: "3 Jean", ch: 1 }, { id: 65, name: "Jude", ch: 1 },
  { id: 66, name: "Apocalypse", ch: 22 },
];

/* EXACT mirror of sanitizeApiText() in index.html. */
function sanitizeApiText(raw) {
  return String(raw)
    .replace(/<S>.*?<\/S>/gi, "")
    .replace(/<sup>.*?<\/sup>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\[(?:\d+|[a-z])\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson(url, attempt = 1) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    const res = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (err) {
    if (attempt < 5) {
      await new Promise(r => setTimeout(r, 800 * attempt));
      return fetchJson(url, attempt + 1);
    }
    throw err;
  }
}

async function run() {
  /* data["bookId:chapter"] = [ "verse1 text", "verse2 text", ... ] (1-based). */
  const data = {};
  let totalVerses = 0;
  const problems = [];

  for (const book of BOOKS) {
    const d = await fetchJson(`${API_BASE}/${book.id}.json`);
    const chapters = Array.isArray(d.chapters) ? d.chapters : [];
    const byNum = new Map();
    for (const c of chapters) byNum.set(Number(c.chapter), c);

    for (let cn = 1; cn <= book.ch; cn++) {
      const c = byNum.get(cn);
      if (!c || !Array.isArray(c.verses) || !c.verses.length) {
        problems.push(`${book.name} ${cn}: chapitre manquant`);
        continue;
      }
      const verses = c.verses
        .map(v => ({ n: Number(v.verse) || 0, t: sanitizeApiText(v.text || "") }))
        .filter(v => v.n > 0 && v.t)
        .sort((a, b) => a.n - b.n);

      /* Verify verse numbers are contiguous 1..N so we can drop them and rely on
         array index. Pad gaps defensively (should not happen with Martin). */
      const max = verses.length ? verses[verses.length - 1].n : 0;
      const arr = new Array(max).fill("");
      for (const v of verses) arr[v.n - 1] = v.t;
      const gaps = arr.filter(x => x === "").length;
      if (gaps) problems.push(`${book.name} ${cn}: ${gaps} verset(s) vide(s)/manquant(s)`);

      data[`${book.id}:${cn}`] = arr;
      totalVerses += verses.length;
    }
    process.stdout.write(`✓ ${book.name} (${book.ch} ch)\n`);
  }

  const json = JSON.stringify(data);
  writeFileSync(new URL("./data-martin.generated.json", import.meta.url), json);

  const gz = gzipSync(Buffer.from(json, "utf8"), { level: 9 });
  const b64 = gz.toString("base64");

  console.log("\n──────── RÉSUMÉ ────────");
  console.log("Chapitres:", Object.keys(data).length);
  console.log("Versets  :", totalVerses);
  console.log("JSON brut :", (json.length / 1e6).toFixed(2), "MB");
  console.log("gzip      :", (gz.length / 1e6).toFixed(2), "MB");
  console.log("base64    :", (b64.length / 1e6).toFixed(2), "MB");
  if (problems.length) {
    console.log("\n⚠️ Anomalies (" + problems.length + "):");
    problems.slice(0, 40).forEach(p => console.log("  - " + p));
    if (problems.length > 40) console.log("  …(+" + (problems.length - 40) + ")");
  } else {
    console.log("\n✅ Aucune anomalie — 66 livres complets.");
  }
}

run().catch(e => { console.error("ÉCHEC:", e); process.exit(1); });
