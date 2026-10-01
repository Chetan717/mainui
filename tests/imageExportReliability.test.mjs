import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  NATIVE_APP_IMAGE_EXPORT_SIZE,
  getImageExportPixelRatio,
} from "../src/pages/Editor/exportUtils.js";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(projectRoot, path), "utf8");

test("native WebView image export is capped at a 1080px square", () => {
  const ratio = getImageExportPixelRatio({
    stageWidth: 320,
    defaultPixelRatio: 8,
    isNativeWebView: true,
  });

  assert.equal(NATIVE_APP_IMAGE_EXPORT_SIZE, 1080);
  assert.equal(320 * ratio, 1080);
});

test("normal browser image export keeps the existing quality ratio", () => {
  assert.equal(
    getImageExportPixelRatio({
      stageWidth: 320,
      defaultPixelRatio: 8,
      isNativeWebView: false,
    }),
    8,
  );
});

test("Editor waits for the main background and a stable Konva frame before export", () => {
  const editor = read("src/pages/Editor/GenralEditPage.jsx");
  const imageExport = editor.slice(
    editor.indexOf("const handleExport = async"),
    editor.indexOf("const handleExportVideo = async"),
  );

  assert.match(imageExport, /selected\?\.url && !bgImage/);
  assert.match(imageExport, /stage\.batchDraw\(\)/);
  assert.match(imageExport, /requestAnimationFrame/);
  assert.match(imageExport, /getImageExportPixelRatio/);
  assert.match(imageExport, /isNativeWebView/);
});


test("responsive editor preview never shrinks the actual Konva export stage", () => {
  const editor = read("src/pages/Editor/GenralEditPage.jsx");
  const stageMarkup = editor.slice(
    editor.indexOf("<Stage"),
    editor.indexOf("</Stage>") + "</Stage>".length,
  );

  assert.match(stageMarkup, /width=\{STAGE_WIDTH\}/);
  assert.match(stageMarkup, /height=\{STAGE_HEIGHT\}/);
  assert.doesNotMatch(editor, /const \[stageSize, setStageSize\]/);
});
