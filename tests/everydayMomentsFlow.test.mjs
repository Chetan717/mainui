import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  EVERYDAY_MOMENT_ENTRIES,
  filterEverydayMomentItems,
  getEverydayMomentSubtypeKey,
  getEverydayMomentSubtypeOptions,
  groupEverydayMomentItemsBySubtype,
  isEverydayMomentType,
} from "../src/utils/everydayMoments.js";

const items = [
  {
    id: "morning-1",
    _template: { id: "template-1", Subtype: "Monday " },
  },
  {
    id: "morning-2",
    _template: { id: "template-2", Subtype: "Monday" },
  },
  {
    id: "morning-3",
    _template: { id: "template-3", Subtype: "Tuesday" },
  },
];

test("Everyday Moments contains only the seven requested Main Types in product order", () => {
  assert.deepEqual(
    EVERYDAY_MOMENT_ENTRIES.map((entry) => entry.type),
    [
      "Good_Morning",
      "Sport",
      "Daily_Life",
      "Greeting_Wishes",
      "Devotional_Spiritual",
      "Health_Tips",
      "Leader_Quotes",
    ],
  );
  assert.equal(isEverydayMomentType("Good_Morning"), true);
  assert.equal(isEverydayMomentType("Bonanza"), false);
});

test("category options, grouping, and filtering normalize subtype whitespace", () => {
  assert.deepEqual(getEverydayMomentSubtypeOptions(items), [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
  ]);
  assert.equal(
    filterEverydayMomentItems(
      items,
      getEverydayMomentSubtypeKey(" Monday "),
    ).length,
    2,
  );

  const groups = groupEverydayMomentItemsBySubtype(items);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].label, "Monday");
  assert.equal(groups[0].items.length, 2);
});

test("Editor loads every subtype and shows Categories only before Image and Video for Everyday types", async () => {
  const source = await readFile(
    new URL(
      "../src/pages/Editor/components/ListOfTemplates.jsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /const isEverydayMoments = isEverydayMomentType\(filterType\)/);
  assert.match(source, /AllTemplateGraphicsService\(/);
  assert.match(source, /groupEverydayMomentItemsBySubtype\(visibleTabItems\)/);
  assert.match(source, /\{isEverydayMoments && \(/);
  assert.match(source, />\s*Categories\s*<\/button>/);
  assert.ok(source.indexOf("Categories") < source.indexOf('label="Image"'));
  assert.ok(source.indexOf('label="Image"') < source.indexOf('label="Video"'));
  assert.match(source, /label: "All Categories"/);
});
