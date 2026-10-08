import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");
const carousel = readFileSync(
  join(projectRoot, "src/pages/Homepage/Component/Carosel.jsx"),
  "utf8",
);

test("Today Trending carousel keeps the requested GIF permanently in first position", () => {
  assert.match(
    carousel,
    /1ZKuNSZ3f82Xpn9bLCP4aXzDFwEXSKgr-/,
  );
  assert.match(
    carousel,
    /const renderSlides = \[PERMANENT_TRENDING_SLIDE, \.\.\.dynamicSlides\]/,
  );
  assert.match(carousel, /permanentPromo: true/);
});

test("dynamic company/general trending slides remain appended after the permanent GIF", () => {
  assert.match(carousel, /TTrend_templateService\(selectedCompany\?\.id \|\| ""\)/);
  assert.match(carousel, /const dynamicSlides = slides\.length/);
});
