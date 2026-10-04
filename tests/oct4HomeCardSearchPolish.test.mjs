import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

import { buildDeepSearchResults } from "../src/pages/Homepage/Component/homeSearchRanking.js";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(root, path), "utf8");

test("long section titles truncate while View All keeps a fixed one-line pill", () => {
  const source = read("src/pages/Homepage/Component/ListOfGenaraltemp.jsx");
  assert.match(source, /min-w-0 flex-1 truncate text-lg/);
  assert.match(source, /h-8 min-w-\[78px\] shrink-0/);
  assert.match(source, /whitespace-nowrap rounded-full/);
});

test("home cards use compact one-line labels with one-direction news-style overflow", () => {
  const source = read("src/pages/Homepage/Component/ListOfGenaraltemp.jsx");
  assert.match(source, /function AutoScrollCardLabel/);
  assert.match(source, /text-\[9px\]/);
  assert.match(source, /template-card-news-ticker/);
  assert.match(source, /to \{ transform: translateX\(-50%\); \}/);
  assert.doesNotMatch(source, /line-clamp-2 min-h-\[26px\]/);
});

test("home card rail keeps a small screen-edge inset and Capping is responsive 16:9", () => {
  const source = read("src/pages/Homepage/Component/ListOfGenaraltemp.jsx");
  assert.match(source, /-mx-1\.5[^"]*px-1\.5/);
  assert.match(source, /w-\[calc\(100vw-40px\)\] min-w-\[220px\] max-w-\[420px\]/);
  assert.match(source, /isCapping \? "aspect-\[16\/9\]" : "aspect-square"/);
});

test("Everyday Moments View All subtype image covers the whole card", () => {
  const source = read("src/pages/Homepage/Component/AllTemplates.jsx");
  const start = source.indexOf("function SubtypeChoiceCard");
  const end = source.indexOf("function EverydayTypeSubtypeSection", start);
  const card = source.slice(start, end);
  assert.match(card, /relative aspect-square w-\[118px\]/);
  assert.match(card, /<ShowcaseImage/);
  assert.match(card, /absolute inset-x-0 bottom-0/);
  assert.doesNotMatch(card, /bg-white text-left/);
});

test("deep subtype search promotes exact matches first without removing normal cached cards", () => {
  const cached = [
    {
      type: "Bonanza",
      templates: [
        { id: "normal-1", Subtype: "Dubai", serial: 1 },
        { id: "normal-2", Subtype: "Kerala", serial: 2 },
      ],
    },
    {
      type: "Motivational",
      templates: [{ id: "mot-1", Subtype: "Go Ahead", serial: 1 }],
    },
  ];
  const deep = {
    Bonanza: [
      { id: "normal-1", Subtype: "Dubai", serial: 1 },
      { id: "goa-deep", Subtype: "GOA", serial: 99 },
    ],
  };

  const results = buildDeepSearchResults(
    cached,
    "Goa",
    (type) => deep[type] || [],
  );

  assert.equal(results[0].type, "Bonanza");
  assert.equal(results[0].templates[0].id, "goa-deep");
  assert.deepEqual(
    results[0].templates.slice(1).map((item) => item.id),
    ["normal-1", "normal-2"],
  );
});
