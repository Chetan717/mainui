import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(root, path), "utf8");

test("Festival date chips are square with only light rounding", () => {
  const source = read("src/pages/Homepage/Component/Festival.jsx");
  assert.match(source, /h-\[50px\] w-\[50px\] min-w-\[50px\]/);
  assert.match(source, /rounded-\[7px\]/);
});

test("Product is an MLM template type above Motivational and routes directly to Editor", () => {
  const service = read("src/pages/Homepage/Component/Services/GeneralTemplateService.jsx");
  const list = read("src/pages/Homepage/Component/ListOfGenaraltemp.jsx");
  const nav = read("src/utils/editorNavigation.js");
  const home = read("src/pages/Home.jsx");

  assert.ok(service.indexOf('"Product"') < service.indexOf('"Motivational"'));
  assert.ok(home.indexOf('"Product"') < home.indexOf('"Motivational"'));
  assert.match(list, /GENERAL_SELECT_TYPES[\s\S]*"Product"/);
  assert.match(nav, /GENERAL_TEMPLATE_TYPES[\s\S]*"Product"/);
  assert.match(list, /MainType: group\?\.templates\?\.\[0\]\?\.MainType/);
});

test("all shared and profile headers use the Home gradient", () => {
  const gradient = "linear-gradient(135deg,#2F80EA_0%,#236FDE_48%,#1454C5_100%)";
  const header = read("src/components/Header.jsx");
  assert.match(header, /const useBlueSubpageHeader = true/);
  assert.ok(header.includes(gradient));
  assert.ok(read("src/pages/Profile/Myprofile.jsx").includes(gradient));
  assert.ok(read("src/pages/Profile/ProfileSubpages.jsx").includes(gradient));
  assert.ok(read("src/pages/Profile/ReferCard.jsx").includes(gradient));
});

test("Editor limits successful image/video download attempts to 10 per day", () => {
  const limit = read("src/services/downloadLimitService.js");
  const editor = read("src/pages/Editor/GenralEditPage.jsx");
  assert.match(limit, /DAILY_DOWNLOAD_LIMIT = 10/);
  assert.ok((editor.match(/reserveDownloadSlot\(\)/g) || []).length >= 3);
  assert.ok((editor.match(/releaseDailyDownload\(dailyReservation\)/g) || []).length >= 3);
});

test("main form uses square live preview and full-screen crop/remove-bg flow", () => {
  const form = read("src/pages/mainform/components/SalesExecutiveForm.jsx");
  const crop = read("src/pages/mainform/components/ImageEditorCanvas.jsx");
  const loader = read("src/pages/mainform/components/RemoveBgLoadingOverlay.jsx");

  assert.match(form, /const showLiveCanvas = hasMeaningfulFormInput/);
  assert.match(form, /rounded-none border border-\[#d6dce8\]/);
  assert.match(form, /fixed inset-0 z-\[99998\] h-\[100dvh\]/);
  assert.equal((form.match(/onProcessingChange=\{setRemoveBgProcessing\}/g) || []).length, 2);
  assert.match(crop, /className="rounded-none"/);
  assert.match(loader, /Remove Background/);
  assert.doesNotMatch(loader, /[\u0900-\u097F]/);
});

test("Editor canvas itself is square", () => {
  const editor = read("src/pages/Editor/GenralEditPage.jsx");
  assert.match(editor, /previewOnly\s*\? "relative[^\n]*rounded-none/);
  assert.match(editor, /: "relative[^\n]*rounded-none/);
});
