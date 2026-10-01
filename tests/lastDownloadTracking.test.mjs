import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(projectRoot, path), "utf8");

test("successful Editor image export uses the immutable Firestore document id", () => {
  const editor = read("src/pages/Editor/GenralEditPage.jsx");
  const service = read("src/services/userActivityService.js");
  const imageExport = editor.slice(
    editor.indexOf("const handleExport = async"),
    editor.indexOf("const handleExportVideo = async"),
  );

  assert.match(service, /LAST_DOWNLOAD_FIELD = "lastDownloadAt"/);
  assert.match(service, /updateDoc\(doc\(db, COLLECTIONS\.USERS, safeId\)/);
  assert.match(service, /\[LAST_DOWNLOAD_FIELD\]: serverTimestamp\(\)/);
  assert.doesNotMatch(service, /getDoc|getDocs|collection\(|query\(|where\(/);

  assert.match(editor, /\.\.\.userDocument\.data\(\),\s*id:\s*userDocument\.id,\s*_documentId:\s*userDocument\.id/s);
  assert.match(editor, /Promise\.allSettled/);
  assert.match(imageExport, /userDocumentId:\s*userData\?\._documentId\s*\|\|\s*userData\?\.id/);
  assert.ok(imageExport.indexOf("recordImageDownload") > imageExport.indexOf("link.click()"));
  assert.ok(imageExport.indexOf("recordImageDownload") < imageExport.indexOf("catch (err)"));
  assert.doesNotMatch(imageExport, /await recordImageDownload/);
});

test("tracking falls back to the authenticated server function when direct writes fail", () => {
  const service = read("src/services/userActivityService.js");
  assert.match(service, /httpsCallable\([\s\S]*"recordUserDownload"/);
  assert.match(service, /catch\s*\{[\s\S]*recordUserDownload\(/);
  assert.doesNotMatch(service, /mobileNo\s*:/);
});

test("video exports do not change the image last-download field", () => {
  const editor = read("src/pages/Editor/GenralEditPage.jsx");
  const videoExports = editor.slice(
    editor.indexOf("const handleExportVideo = async"),
    editor.indexOf("const handleFlip ="),
  );
  assert.doesNotMatch(videoExports, /recordImageDownload/);
});
