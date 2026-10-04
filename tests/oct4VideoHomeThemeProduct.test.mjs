import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(root, path), "utf8");

test("empty editor video tab hides the design and shows the exact unavailable message", () => {
  const editor = read("src/pages/Editor/GenralEditPage.jsx");
  const list = read("src/pages/Editor/components/ListOfTemplates.jsx");

  assert.match(editor, /const isVideoUnavailable[\s\S]*activeTabFromList === "video"/);
  assert.match(editor, /bgStatus === "loading" && !isVideoUnavailable/);
  assert.match(editor, /No Video Available Soon/);
  assert.match(editor, /z-50[\s\S]*bg-\[#F5F7FC\]/);
  assert.match(editor, /const canExport = !subLoading && !exportLoading && !isVideoUnavailable/);
  assert.match(list, /No Video Available Soon/);
});

test("all Home template groups render Festival-style icon plus template name", () => {
  const homeList = read("src/pages/Homepage/Component/ListOfGenaraltemp.jsx");

  assert.match(homeList, /TEMPLATE_SECTION_ICON_BY_TYPE/);
  assert.match(homeList, /Product: PackageOpen/);
  assert.match(homeList, /Motivational: Lightbulb/);
  assert.match(homeList, /TemplateSectionHeading/);
  assert.match(homeList, /rounded-full bg-accent\/10 text-accent/);
  assert.match(homeList, /text-lg font-display font-bold text-foreground/);
});

test("primary app theme tokens match the Home header gradient", () => {
  const css = read("src/index.css");
  assert.match(css, /--accent: #2F80EA/);
  assert.match(css, /--app-theme-primary: #2F80EA/);
  assert.match(css, /--app-theme-secondary: #236FDE/);
  assert.match(css, /--app-theme-tertiary: #1454C5/);
  assert.match(css, /--app-header-gradient: linear-gradient\(135deg,#2F80EA 0%,#236FDE 48%,#1454C5 100%\)/);
  assert.match(css, /button\.bg-accent[\s\S]*background: var\(--app-header-gradient\) !important/);
});

test("Product templates suppress only the separate editor footer PNG", () => {
  const editor = read("src/pages/Editor/GenralEditPage.jsx");
  const mainEditor = read("src/pages/Editor/MainEditor.jsx");
  assert.match(editor, /const NO_FOOTER_TYPES = new Set\(\[[\s\S]*"Product"/);
  assert.match(editor, /const showImageFooter = !NO_FOOTER_TYPES\.has\(Template_Type\)/);
  assert.match(editor, /!showImageFooter \? null : isRight/);
  assert.match(mainEditor, /selll\?\.type !== "Product"[\s\S]*<FooterSelect/);
});
