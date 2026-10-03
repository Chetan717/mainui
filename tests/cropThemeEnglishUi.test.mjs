import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const read = (p) => readFileSync(join(root, p), "utf8");

test("crop and remove-background flow uses the Home blue theme with clear processing states", () => {
  const crop = read("src/pages/mainform/components/ImageEditorCanvas.jsx");
  const profileCrop = read("src/pages/Form/ImageEditorCanvas.jsx");
  const removeBg = read("src/pages/mainform/components/RemoveBgLoadingOverlay.jsx");
  const uploadLoader = read("src/components/DeviceImageUploadLoader.jsx");

  for (const source of [crop, profileCrop, removeBg, uploadLoader]) {
    assert.match(source, /#2F80EA/);
    assert.match(source, /#236FDE/);
    assert.match(source, /#1454C5/);
    assert.doesNotMatch(source, /#f97316|#ea580c/i);
  }

  assert.match(crop, /"Preparing…"/);
  assert.match(crop, /crop-editor-spin/);
  assert.match(crop, /`Saving \$\{encodeProgress\}%`/);
  assert.doesNotMatch(crop, /Loading photo…/);
  assert.match(removeBg, /Remove Background/);
  assert.match(removeBg, /Processing/);
});

test("English is the base UI language and crop labels remain translatable", () => {
  const excluded = new Set([
    "src/i18n/AppLanguageContext.jsx",
    "src/captions.json",
  ]);
  const devanagari = /[\u0900-\u097F]/;
  const hits = [];

  function walk(dir) {
    for (const name of readdirSync(join(root, dir))) {
      const rel = join(dir, name).replaceAll("\\", "/");
      const abs = join(root, rel);
      const stat = statSync(abs);
      if (stat.isDirectory()) {
        if (name !== "node_modules" && name !== "dist") walk(rel);
        continue;
      }
      if (!/\.(?:js|jsx|ts|tsx|css|json)$/.test(name)) continue;
      if (excluded.has(rel) || rel.endsWith("genaral_template_firestore_data.json")) continue;
      const text = readFileSync(abs, "utf8");
      if (devanagari.test(text)) hits.push(rel);
    }
  }

  walk("src");
  assert.deepEqual(hits, []);

  const i18n = read("src/i18n/AppLanguageContext.jsx");
  assert.equal((i18n.match(/"Crop Photo"/g) || []).length, 3);
  assert.equal((i18n.match(/"Remove Background"/g) || []).length, 3);
});
