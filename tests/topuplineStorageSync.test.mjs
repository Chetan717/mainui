import assert from "node:assert/strict";
import test from "node:test";

import {
  getRemovedProfileTopuplines,
  removeTopuplinesFromStoredForm,
  syncRemovedProfileTopuplinesToLocalForm,
} from "../src/utils/topuplineStorageSync.js";

test("detects only Top Upline URLs removed in Banner Settings", () => {
  assert.deepEqual(
    getRemovedProfileTopuplines(["one", "two", "three"], ["one", "three", "four"]),
    ["two"],
  );
});

test("removes a deleted profile URL from both Editor form lists", () => {
  const formOnlyImage = "data:image/png;base64,custom";
  const storedForm = {
    tab: "team",
    selectedLinks: ["one", "two"],
    topuplineURLs: ["one", "two", formOnlyImage],
  };

  assert.deepEqual(removeTopuplinesFromStoredForm(storedForm, ["two"]), {
    tab: "team",
    selectedLinks: ["one"],
    topuplineURLs: ["one", formOnlyImage],
  });
});

test("sync keeps template-only selections and does not add new profile URLs", () => {
  const memory = new Map([
    [
      "mlmform",
      JSON.stringify({
        selectedLinks: ["profile-one", "deleted", "template-only"],
        topuplineURLs: ["profile-one", "deleted", "template-only"],
      }),
    ],
  ]);
  const storage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
  };

  const removed = syncRemovedProfileTopuplinesToLocalForm(
    ["profile-one", "deleted"],
    ["profile-one", "new-profile-url"],
    storage,
  );

  assert.deepEqual(removed, ["deleted"]);
  assert.deepEqual(JSON.parse(memory.get("mlmform")), {
    selectedLinks: ["profile-one", "template-only"],
    topuplineURLs: ["profile-one", "template-only"],
  });
});

test("malformed local form data never blocks a successful profile save", () => {
  const storage = {
    getItem: () => "{broken-json",
    setItem: () => assert.fail("malformed data must not be overwritten"),
  };

  assert.doesNotThrow(() =>
    syncRemovedProfileTopuplinesToLocalForm(["deleted"], [], storage),
  );
});
