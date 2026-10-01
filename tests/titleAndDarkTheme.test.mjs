import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import test from "node:test";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  readFileSync(join(projectRoot, relativePath), "utf8");

function collectSourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = join(directory, entry);
    if (entry === "node_modules" || entry === "dist") return [];
    if (statSync(absolutePath).isDirectory()) return collectSourceFiles(absolutePath);
    return /\.(?:js|jsx|ts|tsx)$/.test(entry) ? [absolutePath] : [];
  });
}

test("every Mr/Mrs/Dr title option group also offers Miss", () => {
  const optionGroupPattern =
    /\[(?=[^\]]*["']Mr\.?["'])(?=[^\]]*["']Mrs\.?["'])(?=[^\]]*["']Dr\.?["'])[^\]]*\]/g;

  for (const file of collectSourceFiles(join(projectRoot, "src"))) {
    const source = readFileSync(file, "utf8");
    for (const group of source.match(optionGroupPattern) || []) {
      assert.match(group, /["']Miss["']/, `${file} is missing the Miss title`);
    }
  }
});

test("saved Miss achiever names are parsed and preserved", () => {
  const salesForm = read("src/pages/mainform/components/SalesExecutiveForm.jsx");
  assert.match(salesForm, /miss:\s*"Miss"/);
  assert.ok(salesForm.includes("Mr\\.?|Mrs\\.?|Miss|Dr\\.?"));
  assert.match(salesForm, /ACHIEVER_TITLE_OPTIONS\.includes\(achiever\.title\)/);
});

test("dark theme provides high-contrast controls and portal surfaces", () => {
  const css = read("src/index.css");
  assert.match(css, /--field-background:\s*#1a2236/);
  assert.match(css, /--field-foreground:\s*#f8fafc/);
  assert.match(css, /input:-webkit-autofill/);
  assert.match(css, /\[data-slot="select-popover"\]/);
  assert.match(css, /\[data-slot="modal-dialog"\]/);
  assert.match(css, /background-color:\s*var\(--overlay\)/);
});

test("light buttons and tabs keep their component-owned text colours", () => {
  const css = read("src/index.css");
  assert.doesNotMatch(css, /(?:^|\n)button\s*\{\s*color:\s*inherit;/);
  assert.match(
    css,
    /:is\(\.dark, \[data-theme="dark"\]\) button\s*\{\s*color:\s*inherit;/,
  );
});

test("Sales form fields use semantic theme colors", () => {
  const salesForm = read("src/pages/mainform/components/SalesExecutiveForm.jsx");
  assert.doesNotMatch(salesForm, /#e2e8f0|#000000|--heroui-background/);
  assert.match(salesForm, /background:\s*"var\(--field-background\)"/);
  assert.match(salesForm, /color:\s*"var\(--field-foreground\)"/);
});
