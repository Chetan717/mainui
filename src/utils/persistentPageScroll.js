const HOME_PATH = "/";
const ALL_TEMPLATES_PATH = "/alltemp";
const HOME_HEADER_HIDE_AT = 16;
const HOME_HEADER_SHOW_AT = 2;

export function shouldHideHomeHeader(scrollTop, currentlyHidden = false) {
  const top = Number(scrollTop);
  const safeTop = Number.isFinite(top) ? Math.max(0, top) : 0;
  return currentlyHidden
    ? safeTop > HOME_HEADER_SHOW_AT
    : safeTop > HOME_HEADER_HIDE_AT;
}

export function getPersistentPageScrollKey(pathname, search = "") {
  if (pathname === HOME_PATH) return HOME_PATH;
  if (pathname === ALL_TEMPLATES_PATH) {
    return `${ALL_TEMPLATES_PATH}${search || ""}`;
  }
  return null;
}

export function shouldResetPersistentPageScroll(
  previousPathname,
  previousSearch,
  pathname,
  search,
) {
  const previousKey = getPersistentPageScrollKey(
    previousPathname,
    previousSearch,
  );
  const nextKey = getPersistentPageScrollKey(pathname, search);

  if (!nextKey?.startsWith(ALL_TEMPLATES_PATH)) return false;

  const opensCategoryFromHome =
    previousKey === HOME_PATH && nextKey.startsWith(ALL_TEMPLATES_PATH);
  const opensSubtypeFromCategory =
    previousKey?.startsWith(ALL_TEMPLATES_PATH) &&
    !String(previousSearch || "").includes("subtype=") &&
    String(search || "").includes("subtype=");

  return opensCategoryFromHome || opensSubtypeFromCategory;
}

export function getPersistentPageScrollTop({
  previousPathname,
  previousSearch = "",
  pathname,
  search = "",
  positions = {},
}) {
  const nextKey = getPersistentPageScrollKey(pathname, search);
  if (!nextKey) return null;

  if (
    shouldResetPersistentPageScroll(
      previousPathname,
      previousSearch,
      pathname,
      search,
    )
  ) {
    return 0;
  }

  const storedTop = Number(positions[nextKey]);
  return Number.isFinite(storedTop) && storedTop > 0 ? storedTop : 0;
}
