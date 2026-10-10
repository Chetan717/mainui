import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), "utf8");

test("template delivery is CDN-first with Firestore fallback", async () => {
  const [cdn, home, festival, trending, all, editor] = await Promise.all([
    read("src/pages/Homepage/Component/Services/templateCdnService.js"),
    read("src/pages/Homepage/Component/Services/GeneralTemplateService.jsx"),
    read("src/pages/Homepage/Component/Services/Festival_template.jsx"),
    read("src/pages/Homepage/Component/Services/TTrend_templateService.jsx"),
    read("src/pages/Homepage/Component/Services/Alltemplateservice.jsx"),
    read("src/pages/Editor/components/ListOfTemplates.jsx"),
  ]);

  assert.match(cdn, /VITE_TEMPLATE_CDN_BASE_URL/);
  assert.match(cdn, /catalog\/v1\/version\.json/);
  assert.match(cdn, /caches\.open\(CACHE_NAME\)/);
  assert.match(cdn, /if \(payload\?\.__mlmCdnMissing\) return null/);
  assert.match(home, /fetchHomeCompanyCatalog/);
  assert.match(home, /fetchHomeGeneralCatalog/);
  assert.match(festival, /fetchFestivalCatalog/);
  assert.match(trending, /fetchTrendingGeneralCatalog/);
  assert.match(all, /fetchMlmTypeCatalog/);
  assert.match(all, /fetchGeneralTypeCatalog/);
  assert.match(editor, /fetchTemplateCatalogById/);
  assert.match(editor, /fetchMlmTypeCatalog/);
  // Emergency Firestore paths intentionally remain during migration.
  assert.match(home, /getDocs/);
  assert.match(festival, /getDocs/);
});

test("client-only RemoveBG model locations are R2-switchable", async () => {
  const [birefnet, modnet] = await Promise.all([
    read("src/pages/mainform/utils/birefnetClient.js"),
    read("src/pages/mainform/utils/modnetBg.js"),
  ]);
  assert.match(birefnet, /VITE_BIREFNET_MODEL_URL/);
  assert.match(modnet, /VITE_MODNET_ASSET_BASE_URL/);
});


test("all General template types refresh from R2 catalog version", async () => {
  const [home, all, editor] = await Promise.all([
    read("src/pages/Homepage/Component/Services/GeneralTemplateService.jsx"),
    read("src/pages/Homepage/Component/Services/Alltemplateservice.jsx"),
    read("src/pages/Editor/components/ListOfTemplates.jsx"),
  ]);

  assert.match(home, /ALL General types are R2\/CDN-first/);
  assert.match(home, /catalogVersion = await getTemplateCatalogVersion\(\)/);
  assert.match(home, /catalogVersion \}/);
  assert.match(all, /fetchGeneralTemplatesForType/);
  assert.match(all, /const cdnItems = await fetchGeneralTypeCatalog\(selectedType\)/);
  assert.match(all, /cached\.catalogVersion/);
  assert.match(editor, /Every General editor flow is CDN-first/);
  assert.match(editor, /fetchGeneralTypeCatalog\(filterType\)/);
});

test("legacy all-General template index loads live R2 JSON instead of relying on bundled export", async () => {
  const [cdn, index, home, all, search] = await Promise.all([
    read("src/pages/Homepage/Component/Services/templateCdnService.js"),
    read("src/pages/Homepage/Component/Services/generalTemplateIndex.js"),
    read("src/pages/Homepage/Component/Services/GeneralTemplateService.jsx"),
    read("src/pages/Homepage/Component/Services/Alltemplateservice.jsx"),
    read("src/pages/Homepage/Component/HomeSearchPage.jsx"),
  ]);
  assert.match(cdn, /genaral_template_firestore_data\.json/);
  assert.match(cdn, /export async function fetchGeneralMasterCatalog/);
  assert.match(index, /fetchGeneralMasterCatalog/);
  assert.match(index, /export async function loadGeneralTemplateIndex/);
  assert.doesNotMatch(index, /import .*genaral_template_firestore_data\.json/);
  assert.match(home, /await loadGeneralTemplateIndex\(\)/);
  assert.match(all, /await loadGeneralTemplateIndex\(\)/);
  assert.match(search, /loadGeneralTemplateIndex\(\{ force: true \}\)/);
  const editor = await read("src/pages/Editor/components/ListOfTemplates.jsx");
  assert.match(editor, /fetchGeneralMasterCatalog/);
  assert.doesNotMatch(editor, /import .*genaral_template_firestore_data\.json/);
});
