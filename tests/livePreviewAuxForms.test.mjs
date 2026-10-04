import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Meeting, Training and Achievement use the real live canvas while editing", () => {
  const sales = read("src/pages/mainform/components/SalesExecutiveForm.jsx");

  assert.match(sales, /const showLiveCanvas = hasMeaningfulFormInput/);
  for (const token of ["isMeeting", "isTraining", "isAchievment", "isIncome"]) {
    assert.match(sales, new RegExp(`\\b${token}\\b`));
  }
  assert.match(sales, /<MeetingForm onPreviewChange=\{setLiveMeetingData\}/);
  assert.match(sales, /onPreviewChange=\{setLiveAchievementForm\}/);
});

test("live preview receives Meeting, Achievement and Income auxiliary form data", () => {
  const sales = read("src/pages/mainform/components/SalesExecutiveForm.jsx");
  const editor = read("src/pages/Editor/GenralEditPage.jsx");

  assert.match(sales, /previewMeetingData=\{isMeeting \? liveMeetingData : undefined\}/);
  assert.match(sales, /previewAchievementForm=\{[\s\S]*liveAchievementForm/);
  assert.match(sales, /previewIncomeFormData=\{isIncome \? liveIncomeFormData : undefined\}/);

  assert.match(editor, /setMeetingData\(previewMeetingData \|\| null\)/);
  assert.match(editor, /setAchievementForm\(previewAchievementForm \|\| null\)/);
  assert.match(editor, /setIncomeFormData\(previewIncomeFormData \|\| null\)/);
});

test("Income crop result is pushed into the live template instead of leaving a stale saved image", () => {
  const income = read("src/pages/mainform/components/IncomeForm.jsx");
  const upload = read("src/pages/mainform/components/ImageUploadSquare.jsx");
  const crop = read("src/pages/mainform/components/ImageEditorCanvas.jsx");

  assert.match(income, /onPreviewChange\?\.\(formData\)/);
  assert.match(upload, /onImageSelect\(dataUrl\)/);
  assert.match(crop, /const z = zoomRef\.current/);
  assert.match(crop, /const \{ dw, dh \} = imgDims\(img, cw, ch, rot, z\)/);
  assert.match(crop, /ctx\.drawImage\([\s\S]*dw \* scale[\s\S]*dh \* scale/);
});
