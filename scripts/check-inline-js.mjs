// scripts/check-inline-js.mjs — parse-check every inline <script> in the admin.
//
// tsc --noEmit does NOT parse the JS inside template-literal strings, so a
// syntax error in an admin <script> (a stray/missing brace) ships green and
// breaks the page at runtime — the settings "Save clears everything" bug
// (commit 15ce704) was exactly this. This extracts each literal <script> body
// and runs new Function() on it; a parse error fails CI.
//
// Scripts that are just injection points (<script>${SOME_CONST}</script>) are
// skipped: their body is unresolved TS template-substitution syntax, not JS,
// and only becomes JS at template-eval time. The inline-authored scripts (the
// real risk surface) are all checked.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = "src/admin";
const tsFiles = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isFile() && d.name.endsWith(".ts"))
  .map((d) => join(root, d.name));

let fails = 0,
  checked = 0,
  skipped = 0;

// 1) Inline <script>...</script> blocks embedded straight in a template
// literal (the settings page): tsc never parses these, so a stray brace
// ships green and kills the whole page's behavior. The settings "Save
// clears everything" bug was exactly this.
const scriptRe = /<script>([\s\S]*?)<\/script>/g;
for (const f of tsFiles) {
  const src = readFileSync(f, "utf8");
  let i = 0,
    m;
  while ((m = scriptRe.exec(src))) {
    i++;
    const body = m[1];
    // Unresolved template-substitution site — can't check statically.
    if (/[$][{][\s\S]*?[}]/.test(body)) {
      skipped++;
      continue;
    }
    // plugins.ts builds its script via `html += '...'` concatenation, not an
    // inline block; the regex then captures the += boilerplate between the
    // two tag strings and that fails to parse. Detect that pattern and skip
    // (its assembled JS is checked separately when needed).
    if (/html\s*\+=/.test(body)) {
      skipped++;
      continue;
    }
    checked++;
    try {
      new Function(body);
    } catch (e) {
      fails++;
      console.error(`PARSE ERROR in ${f} script#${i}: ${e.message}`);
    }
  }
}

// 2) Exported `const X = \`...\`` template-literal scripts (editor.ts): these
// are injected as <script>${X}</script> at runtime, so a parse error in the
// const kills the post/page editor silently. Check them directly.
const constRe = /export\s+const\s+(\w+)\s*=\s*`([\s\S]*?)`;/g;
for (const f of tsFiles) {
  const src = readFileSync(f, "utf8");
  let m;
  while ((m = constRe.exec(src))) {
    const name = m[1];
    const body = m[2];
    if (!/[\n{};()]/.test(body) && body.length < 40) {
      skipped++;
      continue;
    } // not code, just a string
    checked++;
    try {
      new Function(body);
    } catch (e) {
      fails++;
      console.error(`PARSE ERROR in ${f} const ${name}: ${e.message}`);
    }
  }
}

console.log(`checked ${checked} scripts (skipped ${skipped}), ${fails} failures`);
process.exit(fails ? 1 : 0);
