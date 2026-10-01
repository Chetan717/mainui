import assert from "node:assert/strict";
import test from "node:test";

import {
  BANNER_SETTINGS_PATH,
  createBannerSettingsNavigationState,
  getBannerSettingsReturn,
  isBannerSettingsRoute,
} from "../src/utils/bannerSettingsNavigation.js";
import { getAppBackTarget } from "../src/utils/appBackNavigation.js";

test("Banner Settings opened from Editor returns to the same Editor state", () => {
  const editorState = { editorBackTarget: "/mlmform", draftId: "draft-17" };
  const settingsState = createBannerSettingsNavigationState({
    pathname: "/editor",
    search: "?template=rank",
    hash: "#canvas",
    state: editorState,
  });
// gjghghj
  assert.deepEqual(getBannerSettingsReturn(settingsState), {
    to: "/editor?template=rank#canvas",
    state: editorState,
    hasSavedOrigin: true,
  });
  assert.equal(
    getAppBackTarget(
      "/mlmprofile",
      null,
      settingsState,
      "?mode=settings",
    ),
    "/editor?template=rank#canvas",
  );
});

test("Banner Settings opened from Profile returns to Profile", () => {
  const settingsState = createBannerSettingsNavigationState({
    pathname: "/profile",
    search: "",
    hash: "",
    state: null,
  });

  assert.equal(getBannerSettingsReturn(settingsState).to, "/profile");
});

test("direct or invalid settings origins safely fall back to Home", () => {
  assert.deepEqual(getBannerSettingsReturn(null), {
    to: "/",
    state: null,
    hasSavedOrigin: false,
  });
  assert.equal(
    getBannerSettingsReturn({
      bannerSettingsReturn: { to: "https://example.com/editor" },
    }).to,
    "/",
  );
  assert.equal(
    getBannerSettingsReturn({
      bannerSettingsReturn: { to: BANNER_SETTINGS_PATH },
    }).to,
    "/",
  );
});

test("only the settings-mode profile route uses the saved origin", () => {
  const state = createBannerSettingsNavigationState({
    pathname: "/editor",
    state: null,
  });

  assert.equal(isBannerSettingsRoute("/mlmprofile", "?mode=settings"), true);
  assert.equal(isBannerSettingsRoute("/mlmprofile", ""), false);
  assert.equal(getAppBackTarget("/mlmprofile", null, state, ""), "/");
});
