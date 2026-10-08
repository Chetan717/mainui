import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  buildHomeTemplateSections,
  getTemplateTypeDisplayName,
} from "../src/pages/Homepage/Component/homeTemplatePresentation.js";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  readFileSync(join(projectRoot, relativePath), "utf8");

test("Latest Update is a first general group directly below Festival on Home", () => {
  const service = read("src/pages/Homepage/Component/Services/GeneralTemplateService.jsx");
  const latestIndex = service.indexOf('"Latest_update"');
  const productIndex = service.indexOf('"Product"', latestIndex);

  assert.ok(latestIndex >= 0);
  assert.ok(productIndex > latestIndex);
  assert.match(service, /type === "Domestic_Trip" \|\| type === "Latest_update"/);
  assert.equal(getTemplateTypeDisplayName("Latest_update"), "Latest Update");

  const sections = buildHomeTemplateSections([
    { type: "Product", templates: [{ id: "p1" }] },
    { type: "Latest_update", templates: [{ id: "l1" }] },
  ]);
  assert.deepEqual(
    sections.map((section) => section.title),
    ["Latest Update", "Product"],
  );
});

test("Latest Update stays a live General editor flow across View All and Editor", () => {
  const allTemplates = read("src/pages/Homepage/Component/Services/Alltemplateservice.jsx");
  const editorList = read("src/pages/Editor/components/ListOfTemplates.jsx");
  const homeList = read("src/pages/Homepage/Component/ListOfGenaraltemp.jsx");
  const editor = read("src/pages/Editor/GenralEditPage.jsx");

  assert.match(allTemplates, /LIVE_GENERAL_TEMPLATE_TYPES\.add\("Latest_update"\)/);
  assert.match(editorList, /filterType === "Domestic_Trip" \|\| filterType === "Latest_update"/);
  assert.match(homeList, /"Latest_update"/);
  assert.match(editor, /\{ name: "Latest Update", value: "Latest_update" \}/);
});
