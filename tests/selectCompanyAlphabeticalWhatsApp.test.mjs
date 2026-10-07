import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(
  resolve(import.meta.dirname, "../src/pages/SelectCompany/SelectComp.jsx"),
  "utf8",
);

test("Select Company directory is sorted A to Z", () => {
  assert.match(
    source,
    /\.sort\(\(a, b\) => a\.name\.localeCompare\(b\.name/,
  );
  assert.doesNotMatch(
    source,
    /\.sort\(\(a, b\) => b\.name\.localeCompare\(a\.name/,
  );
});

test("Select Company WhatsApp contact shows the WhatsApp logo", () => {
  assert.match(source, /href="https:\/\/wa\.me\/919341947815"/);
  assert.match(source, /fill-\[#25D366\]/);
  assert.match(source, /Contact us on WhatsApp/);
});
