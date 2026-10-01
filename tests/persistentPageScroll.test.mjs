import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getPersistentPageScrollKey,
  getPersistentPageScrollTop,
  shouldHideHomeHeader,
  shouldResetPersistentPageScroll,
} from "../src/utils/persistentPageScroll.js";

test("Home header hides after scrolling and returns only at the top", () => {
  assert.equal(shouldHideHomeHeader(0, false), false);
  assert.equal(shouldHideHomeHeader(17, false), true);
  assert.equal(shouldHideHomeHeader(8, true), true);
  assert.equal(shouldHideHomeHeader(2, true), false);
});

test("Home View All always opens the All Templates category at the top", () => {
  const positions = { "/": 720, "/alltemp": 410 };

  assert.equal(
    shouldResetPersistentPageScroll("/", "", "/alltemp", ""),
    true,
  );
  assert.equal(
    getPersistentPageScrollTop({
      previousPathname: "/",
      pathname: "/alltemp",
      positions,
    }),
    0,
  );
});

test("subtype View All opens its full grid at the top", () => {
  const subtypeSearch = "?subtype=Rank%20Promotion";

  assert.equal(
    shouldResetPersistentPageScroll(
      "/alltemp",
      "",
      "/alltemp",
      subtypeSearch,
    ),
    true,
  );
  assert.equal(
    getPersistentPageScrollTop({
      previousPathname: "/alltemp",
      pathname: "/alltemp",
      search: subtypeSearch,
      positions: { [`/alltemp${subtypeSearch}`]: 930 },
    }),
    0,
  );
});

test("Everyday Moments group and its subtype grid each open at the top", () => {
  const groupSearch = "?group=everyday-moments";
  const subtypeSearch =
    "?group=everyday-moments&type=Good_Morning&subtype=Monday";

  assert.equal(
    getPersistentPageScrollTop({
      previousPathname: "/",
      pathname: "/alltemp",
      search: groupSearch,
      positions: { [`/alltemp${groupSearch}`]: 810 },
    }),
    0,
  );
  assert.equal(
    getPersistentPageScrollTop({
      previousPathname: "/alltemp",
      previousSearch: groupSearch,
      pathname: "/alltemp",
      search: subtypeSearch,
      positions: { [`/alltemp${subtypeSearch}`]: 920 },
    }),
    0,
  );
});

test("back and Editor return restore the correct saved page position", () => {
  const subtypeSearch = "?subtype=Training";
  const positions = {
    "/": 680,
    "/alltemp": 350,
    [`/alltemp${subtypeSearch}`]: 540,
  };

  assert.equal(
    getPersistentPageScrollTop({
      previousPathname: "/alltemp",
      previousSearch: subtypeSearch,
      pathname: "/alltemp",
      positions,
    }),
    350,
  );
  assert.equal(
    getPersistentPageScrollTop({
      previousPathname: "/editor",
      pathname: "/alltemp",
      search: subtypeSearch,
      positions,
    }),
    540,
  );
  assert.equal(
    getPersistentPageScrollTop({
      previousPathname: "/alltemp",
      pathname: "/",
      positions,
    }),
    680,
  );
  assert.equal(getPersistentPageScrollKey("/editor", ""), null);
});

test("PersistentPages uses its own Layout scroll ref instead of a global selector", async () => {
  const [appSource, layoutSource] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/Layout.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(appSource, /mainScrollRef=\{scrollContainerRef\}/);
  assert.match(appSource, /onMainScroll=\{handlePersistentScroll\}/);
  assert.match(appSource, /scrollContainer\.scrollTop = nextTop/);
  assert.match(appSource, /hideHeader=\{isHome && homeHeaderHidden\}/);
  assert.match(layoutSource, /ref=\{mainScrollRef\}/);
  assert.match(layoutSource, /onScroll=\{onMainScroll\}/);
  assert.match(layoutSource, /hidden=\{hideHeader\}/);
});
