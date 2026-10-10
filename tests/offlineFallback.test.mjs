import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sw = readFileSync(new URL("../public/firebase-messaging-sw.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const vercel = readFileSync(new URL("../vercel.json", import.meta.url), "utf8");

test("service worker provides a self-contained offline navigation fallback", () => {
  assert.match(sw, /No Internet Connection/);
  assert.match(sw, /request\.mode !== 'navigate'/);
  assert.match(sw, /cache\.match\(OFFLINE_KEY\)/);
  assert.match(sw, /window\.addEventListener\('online'/);
});

test("offline service worker registers globally before the React app", () => {
  const registerIndex = html.indexOf('.register("/firebase-messaging-sw.js"');
  const appIndex = html.indexOf('src="/src/main.tsx"');
  assert.ok(registerIndex >= 0);
  assert.ok(appIndex >= 0);
  assert.ok(registerIndex < appIndex);
});

test("Vercel revalidates the service worker", () => {
  assert.match(vercel, /firebase-messaging-sw\.js/);
  assert.match(vercel, /max-age=0, must-revalidate/);
});
