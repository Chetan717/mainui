import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  readFileSync(join(projectRoot, relativePath), "utf8");

test("remove background routing is client-only with no VPS inference path", () => {
  const removeBg = read("src/pages/mainform/utils/removeBg.js");
  const birefnet = read("src/pages/mainform/utils/birefnetClient.js");

  assert.equal(
    existsSync(join(projectRoot, "src/pages/mainform/utils/removeBgServer.js")),
    false,
  );
  assert.match(removeBg, /serverIncluded:\s*false/);
  assert.match(removeBg, /imageUploadForInference:\s*false/);
  assert.match(removeBg, /removeBackgroundWithBiRefNet/);
  assert.match(removeBg, /removeBackgroundWithModNet/);
  assert.doesNotMatch(removeBg, /rmbg\.mlmlive\.in|\/v1\/remove-background/);
  assert.doesNotMatch(birefnet, /rmbg\.mlmlive\.in|\/v1\/remove-background/);
});

test("first-use quality model does not block indefinitely", () => {
  const removeBg = read("src/pages/mainform/utils/removeBg.js");
  assert.match(removeBg, /MAX_WAIT_FOR_BACKGROUND_PRELOAD_MS = 3500/);
  assert.match(removeBg, /waitAtMost/);
  assert.match(removeBg, /runModNet/);
});
