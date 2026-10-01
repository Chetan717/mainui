import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildEverydayMomentsAllTemplatesPath,
  buildEverydayMomentTypePath,
  buildAllTemplatesReturnPath,
  buildAllTemplatesSubtypePath,
  getAllTemplatesBackTarget,
  getAllTemplatesGroup,
  getAllTemplatesSubtype,
  getAllTemplatesType,
  isValidAllTemplatesReturnPath,
} from "../src/utils/allTemplatesNavigation.js";
import {
  buildEditorTemplateSeed,
  getEditorGraphicSelectionKey,
} from "../src/utils/editorTemplateSelection.js";
import { getAppBackTarget } from "../src/utils/appBackNavigation.js";
import {
  getSubtypeRowItems,
  groupTemplateGraphicsBySubtype,
} from "../src/pages/Homepage/Component/templateGraphicsView.js";
import { EVERYDAY_MOMENTS_GROUP_KEY } from "../src/utils/everydayMoments.js";

const graphic = (id) => ({
  id,
  url: `https://cdn.example/${id}.jpg`,
  suggestionImage: `https://cdn.example/showcase-${id}.jpg`,
});

test("category data is grouped by subtype and horizontal rows expose every background", () => {
  const sections = groupTemplateGraphicsBySubtype([
    {
      id: "parent-a",
      Subtype: "GOLD",
      GraphicsLink: Array.from({ length: 12 }, (_, index) => graphic(`a-${index}`)),
    },
    {
      id: "parent-b",
      Subtype: "SILVER",
      GraphicsLink: [graphic("b-0")],
    },
    {
      id: "parent-c",
      Subtype: "GOLD",
      GraphicsLink: [graphic("c-0")],
    },
  ]);

  assert.deepEqual(
    sections.map((section) => [section.subtype, section.items.length]),
    [
      ["GOLD", 13],
      ["SILVER", 1],
    ],
  );
  assert.equal(getSubtypeRowItems(sections[0]).length, 13);
  assert.equal(sections[0].items[12]._template.id, "parent-c");
});

test("GraphicsLink identity stays exact even when raw graphic ids are duplicated", () => {
  const shared = { id: "same-id", url: "https://cdn.example/same.jpg" };
  const firstKey = getEditorGraphicSelectionKey(shared, "parent-a");
  const secondKey = getEditorGraphicSelectionKey(shared, "parent-b");

  assert.notEqual(firstKey, secondKey);
});

test("editor seed keeps the explicitly selected background first and identifiable", () => {
  const graphics = Array.from({ length: 25 }, (_, index) => graphic(`g-${index}`));
  const template = {
    id: "template-1",
    MainType: "General",
    type: "Motivational",
    Subtype: "Success",
    serial: 7,
    GraphicsLink: graphics,
  };
  const selectedGraphic = graphics[23];
  const seed = buildEditorTemplateSeed({
    template,
    selectedGraphic,
    companyId: "company-1",
  });

  assert.equal(seed.items.length, 20);
  assert.equal(seed.items[0].id, selectedGraphic.id);
  assert.equal(
    seed.selectedGraphicKey,
    getEditorGraphicSelectionKey(selectedGraphic, template.id),
  );
});

test("subtype grid URL round-trips and its back target is the category page", () => {
  const path = buildAllTemplatesSubtypePath("Rank & Gold");
  const search = path.slice(path.indexOf("?"));

  assert.equal(getAllTemplatesSubtype(search), "Rank & Gold");
  assert.equal(getAllTemplatesBackTarget(search), "/alltemp");
  assert.equal(getAllTemplatesBackTarget(""), "/");
  assert.equal(buildAllTemplatesReturnPath(search), path);
  assert.equal(buildAllTemplatesReturnPath(""), "/alltemp");
  assert.equal(getAppBackTarget("/alltemp", null, null, search), "/alltemp");
  assert.equal(getAppBackTarget("/alltemp", null, null, ""), "/");
});

test("Everyday Moments group, type, and subtype URLs preserve the complete return flow", () => {
  const groupPath = buildEverydayMomentsAllTemplatesPath();
  const groupSearch = groupPath.slice(groupPath.indexOf("?"));
  const typePath = buildEverydayMomentTypePath("Good_Morning");
  const typeSearch = typePath.slice(typePath.indexOf("?"));
  const subtypePath = buildAllTemplatesSubtypePath("Monday Morning", {
    group: EVERYDAY_MOMENTS_GROUP_KEY,
    type: "Good_Morning",
  });
  const subtypeSearch = subtypePath.slice(subtypePath.indexOf("?"));

  assert.equal(getAllTemplatesGroup(groupSearch), EVERYDAY_MOMENTS_GROUP_KEY);
  assert.equal(getAllTemplatesBackTarget(groupSearch), "/");
  assert.equal(buildAllTemplatesReturnPath(groupSearch), groupPath);
  assert.equal(isValidAllTemplatesReturnPath(groupPath), true);

  assert.equal(getAllTemplatesType(typeSearch), "Good_Morning");
  assert.equal(getAllTemplatesBackTarget(typeSearch), groupPath);
  assert.equal(buildAllTemplatesReturnPath(typeSearch), typePath);
  assert.equal(isValidAllTemplatesReturnPath(typePath), true);

  assert.equal(getAllTemplatesType(subtypeSearch), "Good_Morning");
  assert.equal(getAllTemplatesSubtype(subtypeSearch), "Monday Morning");
  assert.equal(getAllTemplatesBackTarget(subtypeSearch), groupPath);
  assert.equal(buildAllTemplatesReturnPath(subtypeSearch), subtypePath);
  assert.equal(isValidAllTemplatesReturnPath(subtypePath), true);
  assert.equal(
    getAppBackTarget("/alltemp", null, null, subtypeSearch),
    groupPath,
  );
});

test("View All renders GraphicsLink showcases instead of parent Showcase_url cards", async () => {
  const [source, editorListSource] = await Promise.all([
    readFile(
      new URL("../src/pages/Homepage/Component/AllTemplates.jsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../src/pages/Editor/components/ListOfTemplates.jsx",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(source, /groupTemplateGraphicsBySubtype/);
  assert.match(source, /getSubtypeRowItems\(section\)/);
  assert.doesNotMatch(source, /GRAPHICS_ROW_LIMIT/);
  assert.match(source, /h-\[110px\] w-\[110px\]/);
  assert.match(source, /grid grid-cols-3/);
  assert.match(source, /layout="grid"/);
  assert.doesNotMatch(source, /grid grid-cols-2 justify-items-center/);
  assert.doesNotMatch(source, /aspect-\[4\/5\]/);
  assert.match(source, /storeEditorTemplateSeed/);
  assert.doesNotMatch(source, /Showcase_url/);
  assert.match(source, /EVERYDAY_MOMENT_ENTRIES/);
  assert.match(source, /SubtypeChoiceCard/);
  assert.match(source, /isEverydayLanding/);
  assert.match(source, /typeSection\.subtypeSections\.map/);
  assert.match(source, /View All/);
  assert.match(source, /previewLimit=\{isEverydayTypePage \? 4 : null\}/);
  assert.match(source, /visibleRowItems/);
  assert.match(source, /IntersectionObserver/);
  assert.match(editorListSource, /findEditorItemBySelectionKey/);
  assert.match(editorListSource, /selectedSelectionKey === getEditorGraphicSelectionKey/);
});

test("Graphics reads are shared across Home, group, subtype, and Editor navigation", async () => {
  const [
    serviceSource,
    homeServiceSource,
    homeSource,
    contextSource,
    editorListSource,
  ] = await Promise.all([
    readFile(
      new URL(
        "../src/pages/Homepage/Component/Services/Alltemplateservice.jsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../src/pages/Homepage/Component/Services/GeneralTemplateService.jsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../src/pages/Home.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/Context/GeneralContext.jsx", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../src/pages/Editor/components/ListOfTemplates.jsx",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(serviceSource, /ALL_TEMPLATE_GRAPHICS_CACHE_TTL_MS/);
  assert.match(serviceSource, /_graphicsRequests/);
  assert.match(serviceSource, /if \(pending\) return pending/);
  assert.match(serviceSource, /primeAllTemplateGraphicsCache/);
  assert.match(homeServiceSource, /mlmTemplates\.length < HOME_LIMIT/);
  assert.match(homeServiceSource, /getAllGeneralTemplates\(type\)/);
  assert.match(homeServiceSource, /primeAllTemplateGraphicsCache\(/);
  assert.match(homeSource, /clearAllTemplateGraphicsCache\(\)/);
  assert.match(contextSource, /clearAllTemplateGraphicsCache\(\)/);
  assert.match(editorListSource, /clearAllTemplateGraphicsCache\(\)/);
});
