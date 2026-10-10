import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/pages/Home.jsx", import.meta.url), "utf8");

test("home exposes a visible floating WhatsApp support button above mobile tab bar", () => {
  assert.match(source, /href="https:\/\/wa\.me\/919341947815"/);
  assert.match(source, /aria-label="Contact customer care on WhatsApp"/);
  assert.match(source, /fixed right-3 z-\[60\]/);
  assert.match(source, /env\(safe-area-inset-bottom\) \+ 70px/);
  assert.match(source, /bg-\[#25D366\]/);
  assert.match(source, /md:hidden/);
});
