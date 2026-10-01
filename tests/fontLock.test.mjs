import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  readFileSync(join(projectRoot, relativePath), "utf8");

test("app UI stays locked to Figtree while Konva canvas fonts remain unchanged", () => {
  const uiFiles = [
    "index.html",
    "src/index.css",
    "src/components-source/Sidebar.jsx",
    "src/components/ErrorBoundary.jsx",
    "src/pages/Test.jsx",
    "src/pages/Form/ImageEditorCanvas.jsx",
    "src/pages/mainform/components/ImageEditorCanvas.jsx",
  ];
  const uiSource = uiFiles.map(read).join("\n");

  assert.match(uiSource, /--font-sans:\s*'Figtree'/);
  assert.match(uiSource, /--font-display:\s*'Figtree'/);
  assert.match(uiSource, /family=Figtree/);
  assert.doesNotMatch(
    uiSource,
    /Roboto|["'](?:Inter|Syne|DM Sans|Space Mono|SF Pro Text)["']|system-ui|-apple-system|fontFamily:\s*["']monospace/,
  );

  const konva = read("src/pages/Editor/GenralEditPage.jsx");
  assert.equal((konva.match(/fontFamily="Montserrat"/g) || []).length, 42);
  assert.equal((konva.match(/fontFamily="Arial"/g) || []).length, 1);
});
