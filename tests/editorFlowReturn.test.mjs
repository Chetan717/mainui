import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getEditorBackTarget,
  getTemplateFlowReturnTarget,
  isValidEditorBackTarget,
} from "../src/utils/editorNavigation.js";
import { getAppBackTarget } from "../src/utils/appBackNavigation.js";
import {
  buildAllTemplatesSubtypePath,
  buildEverydayMomentsAllTemplatesPath,
} from "../src/utils/allTemplatesNavigation.js";

const subtypeReturnTarget = buildAllTemplatesSubtypePath("Rank & Gold");
const selectedFromFlow = {
  id: "template-7",
  type: "Meeting",
  templateFlowReturnTarget: subtypeReturnTarget,
};

test("Editor accepts only safe in-app flow return targets", () => {
  const everydayGroupTarget = buildEverydayMomentsAllTemplatesPath();
  assert.equal(isValidEditorBackTarget("/alltemp"), true);
  assert.equal(isValidEditorBackTarget(subtypeReturnTarget), true);
  assert.equal(isValidEditorBackTarget(everydayGroupTarget), true);
  assert.equal(isValidEditorBackTarget("/alltemp?subtype="), false);
  assert.equal(isValidEditorBackTarget("//example.com/alltemp"), false);
  assert.equal(isValidEditorBackTarget("https://example.com/alltemp"), false);
});

test("direct and form-based Editor entries return to the exact subtype page", () => {
  assert.equal(
    getEditorBackTarget(null, { editorBackTarget: subtypeReturnTarget }),
    subtypeReturnTarget,
  );
  assert.equal(
    getTemplateFlowReturnTarget({
      selectedType: selectedFromFlow,
      fallback: "/mlmform",
    }),
    subtypeReturnTarget,
  );
  assert.equal(
    getEditorBackTarget(selectedFromFlow, null),
    subtypeReturnTarget,
  );
});

test("normal Home form flow keeps its existing Home and form back behavior", () => {
  const normalSelection = { id: "template-8", type: "Meeting" };

  assert.equal(
    getTemplateFlowReturnTarget({
      selectedType: normalSelection,
      fallback: "/mlmform",
    }),
    "/mlmform",
  );
  assert.equal(
    getAppBackTarget("/mlmform", normalSelection, null, ""),
    "/",
  );
  assert.equal(
    getAppBackTarget("/mlmform", selectedFromFlow, null, ""),
    subtypeReturnTarget,
  );
});

test("All Templates and both form submit paths preserve the source-aware return target", async () => {
  const [allTemplates, salesForm, meetingForm] = await Promise.all([
    readFile(
      new URL("../src/pages/Homepage/Component/AllTemplates.jsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../src/pages/mainform/components/SalesExecutiveForm.jsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../src/pages/mainform/components/MeetingForm.jsx",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(allTemplates, /templateFlowReturnTarget/);
  assert.match(allTemplates, /lastAllTemplatesSearchRef/);
  assert.match(allTemplates, /state: \{ editorBackTarget: templateFlowReturnTarget \}/);
  assert.match(allTemplates, /h-\[110px\] w-\[110px\]/);
  assert.doesNotMatch(allTemplates, /h-\[130px\] w-\[100px\]/);

  for (const formSource of [salesForm, meetingForm]) {
    assert.match(formSource, /getTemplateFlowReturnTarget/);
    assert.match(formSource, /state: \{ editorBackTarget \}/);
  }
});
