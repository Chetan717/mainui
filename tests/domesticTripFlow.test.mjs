import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

import { isBonanzaFlowType } from "../src/utils/templateTypeConfig.js";
import {
  buildHomeTemplateSections,
  getHomeTemplateSearchText,
} from "../src/pages/Homepage/Component/homeTemplatePresentation.js";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  readFileSync(join(projectRoot, relativePath), "utf8");

test("Domestic Trip is a Bonanza-equivalent form/editor flow", () => {
  assert.equal(isBonanzaFlowType("Bonanza"), true);
  assert.equal(isBonanzaFlowType("Domestic_Trip"), true);
  assert.equal(isBonanzaFlowType("Training"), false);
});

test("Domestic Trip appears immediately after Bonanza on Home", () => {
  const groups = [
    { type: "Domestic_Trip", templates: [{ id: "trip-1" }] },
    { type: "Bonanza", templates: [{ id: "bonanza-1" }] },
  ];
  const sections = buildHomeTemplateSections(groups);
  assert.deepEqual(
    sections.map((section) => section.title),
    ["Bonanza", "Domestic Trip"],
  );
  assert.match(getHomeTemplateSearchText("Domestic_Trip"), /domestic trip/);
});

test("Domestic Trip is loaded live from Firestore across Home, View All, and Editor", () => {
  const homeService = read(
    "src/pages/Homepage/Component/Services/GeneralTemplateService.jsx",
  );
  const allTemplatesService = read(
    "src/pages/Homepage/Component/Services/Alltemplateservice.jsx",
  );
  const editorList = read("src/pages/Editor/components/ListOfTemplates.jsx");

  assert.match(homeService, /type === "Domestic_Trip"/);
  assert.match(homeService, /where\("SelectType", "==", type\)/);
  assert.match(allTemplatesService, /LIVE_GENERAL_TEMPLATE_TYPES = new Set\(\["Domestic_Trip"\]\)/);
  assert.match(editorList, /filterType === "Domestic_Trip"/);
});

test("Domestic Trip uses Bonanza form and canvas conditions", () => {
  const form = read("src/pages/mainform/components/SalesExecutiveForm.jsx");
  const crop = read("src/pages/mainform/components/ImageEditorCanvas.jsx");
  const editor = read("src/pages/Editor/GenralEditPage.jsx");
  const constants = read("src/pages/Editor/Constants.js");

  assert.match(form, /isBonanzaFlowType\(selll\?\.type\)/);
  assert.match(form, /Domestic Trip Details/);
  assert.match(crop, /isBonanzaFlowType\(selll\?\.type\)/);
  assert.match(editor, /isBonanzaFlowType\(Template_Type\)/);
  assert.match(constants, /\{ name: "Domestic Trip", value: "Domestic_Trip" \}/);
});
