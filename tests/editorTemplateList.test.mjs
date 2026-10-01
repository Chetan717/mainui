import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getGeneralItemsForEditor,
  isEditorTemplateSeedForSelection,
  prepareEditorItemsForSelection,
} from "../src/utils/editorTemplateList.js";
import { getEditorGraphicSelectionKey } from "../src/utils/editorTemplateSelection.js";

const graphics = Array.from({ length: 11 }, (_, index) => ({
  id: `jaisalmer-${index + 1}`,
  url: `https://cdn.example/jaisalmer-${index + 1}.webp`,
  suggestionImage: `https://cdn.example/showcase-${index + 1}.webp`,
}));

const jaisalmerData = {
  data: {
    "jaisalmer-template": {
      MainType: "General",
      SelectType: "Bonanza",
      Subtype: "JAISLMER ",
      Active: true,
      Launched: true,
      serial: 0,
      GraphicsLink: graphics,
    },
  },
};

test("Editor matches a subtype even when Firestore data has trailing spaces", () => {
  const items = getGeneralItemsForEditor(
    jaisalmerData,
    "Bonanza",
    "JAISLMER ",
  );

  assert.equal(items.length, 11);
  assert.equal(items[0]._template.id, "jaisalmer-template");
});

test("the bundled JAISLMER Bonanza exposes every uploaded GraphicsLink", async () => {
  const templateData = JSON.parse(
    await readFile(
      new URL(
        "../src/pages/Homepage/Component/Services/genaral_template_firestore_data.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const selectedEntry = Object.entries(templateData.data).find(
    ([, template]) =>
      String(template?.Subtype || "").trim().toUpperCase() === "JAISLMER",
  );

  assert.ok(selectedEntry, "JAISLMER Bonanza template should exist");
  const [templateId, template] = selectedEntry;
  const items = getGeneralItemsForEditor(
    templateData,
    template.SelectType,
    template.Subtype,
  ).filter((item) => item._template.id === templateId);

  assert.ok(template.GraphicsLink.length > 1);
  assert.equal(items.length, template.GraphicsLink.length);
});

test("Editor seed scope comparison normalizes surrounding whitespace", () => {
  assert.equal(
    isEditorTemplateSeedForSelection(
      {
        type: "Bonanza",
        subType: "JAISLMER ",
        mainType: "General",
        companyId: "company-1",
      },
      {
        type: " Bonanza ",
        subType: "JAISLMER",
        mainType: "General ",
        companyId: "company-1",
      },
    ),
    true,
  );
});

test("an empty full fetch keeps the complete seed instead of one selected item", () => {
  const seededItems = graphics.map((graphic) => ({
    ...graphic,
    _template: { id: "jaisalmer-template", serial: 0 },
  }));
  const selectedKey = getEditorGraphicSelectionKey(seededItems[7]);
  const prepared = prepareEditorItemsForSelection(
    [],
    selectedKey,
    seededItems,
    seededItems,
  );

  assert.equal(prepared.length, 11);
  assert.equal(getEditorGraphicSelectionKey(prepared[0]), selectedKey);
});

test("ListOfTemplates uses normalized editor list helpers", async () => {
  const source = await readFile(
    new URL(
      "../src/pages/Editor/components/ListOfTemplates.jsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /normalizeEditorTemplateFilter\(selType\?\.Subtype\)/);
  assert.match(source, /getGeneralItemsForEditor/);
  assert.match(source, /prepareEditorItemsForSelection/);
  assert.doesNotMatch(source, /templateSubType === subType/);
});
