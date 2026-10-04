import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(root, path), "utf8");

test("home cards are inset, compact, one-line, and overflow labels auto-pan only when needed", () => {
  const source = read("src/pages/Homepage/Component/ListOfGenaraltemp.jsx");
  assert.match(source, /const AutoScrollLabel/);
  assert.match(source, /label\.scrollWidth - container\.clientWidth/);
  assert.match(source, /shouldScroll \? "home-card-label-pan" : ""/);
  assert.match(source, /overflow-x-auto scroll-smooth snap-x snap-mandatory px-1 pb-2/);
  assert.match(source, /h-\[28px\] px-2/);
  assert.match(source, /text-\[9px\]/);
  assert.doesNotMatch(source, /line-clamp-2 min-h-\[26px\]/);
});

test("Capping uses one responsive horizontal rectangle card", () => {
  const source = read("src/pages/Homepage/Component/ListOfGenaraltemp.jsx");
  assert.match(source, /group\?\.type === "Capping"/);
  assert.match(source, /slice\(0, 1\)/);
  assert.match(source, /w-\[calc\(100vw-32px\)\] min-w-\[260px\] max-w-\[520px\]/);
  assert.match(source, /isCapping \? "aspect-\[16\/9\]" : "aspect-square"/);
});

test("empty Video tab fully hides the design canvas and shows the requested message", () => {
  const editor = read("src/pages/Editor/GenralEditPage.jsx");
  const list = read("src/pages/Editor/components/ListOfTemplates.jsx");
  assert.match(editor, /No Video Available Soon/);
  assert.match(editor, /visibility: isVideoUnavailable \? "hidden" : "visible"/);
  assert.match(editor, /const canExport = !subLoading && !exportLoading && !isVideoUnavailable/);
  assert.match(editor, /className="absolute inset-0 z-20 flex items-center justify-center bg-background/);
  assert.match(list, /No Video Available Soon/);
});
