import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const allTemplatesUrl = new URL(
  "../src/pages/Homepage/Component/AllTemplates.jsx",
  import.meta.url,
);

test("Everyday View All virtualizes off-screen preview images and subtype rows", async () => {
  const source = await readFile(allTemplatesUrl, "utf8");

  assert.match(source, /aggressiveLazy \? false : Boolean/);
  assert.match(source, /setShouldLoad\(entry\.isIntersecting\)/);
  assert.match(source, /rootMargin: aggressiveLazy \? "180px" : "260px"/);
  assert.match(source, /!loaded && \(!aggressiveLazy \|\| shouldLoad\)/);
  assert.match(source, /function EverydayTypeSubtypeSection/);
  assert.match(source, /rootMargin: "600px 0px"/);
  assert.match(source, /h-\[183px\]/);
});

test("Everyday subtype View All progressively renders the all-designs grid", async () => {
  const source = await readFile(allTemplatesUrl, "utf8");

  assert.match(source, /function EverydayGraphicsGrid/);
  assert.match(source, /Math\.min\(36, items\.length\)/);
  assert.match(source, /Math\.min\(current \+ 30, items\.length\)/);
  assert.match(source, /rootMargin: "900px 0px"/);
  assert.match(source, /visibleItems = items\.slice\(0, visibleCount\)/);
  assert.match(source, /layout="grid"\s+aggressiveLazy/);
});

test("single vertical scroll optimization is scoped to Everyday Moments only", async () => {
  const source = await readFile(allTemplatesUrl, "utf8");

  assert.match(
    source,
    /isEverydayGroup\s*\? "z-10 px-4 py-6 md:px-8"\s*:\s*"layout-scroll-container z-10 flex-1 overflow-y-auto px-4 py-6 md:px-8"/,
  );
  assert.match(
    source,
    /isEverydayGroup\s*\? "bg-background"\s*:\s*"bg-background\/85 backdrop-blur-xl"/,
  );
});
