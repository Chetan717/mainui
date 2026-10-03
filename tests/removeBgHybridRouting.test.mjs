import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  readFileSync(join(projectRoot, relativePath), "utf8");

test("hybrid routing keeps local result as server-busy fallback", () => {
  const hybrid = read("src/pages/mainform/utils/removeBg.js");
  const server = read("src/pages/mainform/utils/removeBgServer.js");

  assert.match(hybrid, /if \(!assessment\.complex\)/);
  assert.match(hybrid, /const serverResult = await tryServer\(file, signal\)/);
  assert.match(hybrid, /local-server-fallback/);
  assert.match(hybrid, /return localResult/);
  assert.match(server, /response\.status === 429 \|\| response\.status === 503/);
  assert.match(server, /VITE_REMOVEBG_API_URL/);
  assert.match(server, /Authorization = `Bearer \$\{token\}`/);
});

test("server integration never stores user image in browser persistence", () => {
  const server = read("src/pages/mainform/utils/removeBgServer.js");
  assert.doesNotMatch(server, /localStorage\.setItem|indexedDB\.open/);
  assert.match(server, /body: file/);
  assert.match(server, /return output/);
});
