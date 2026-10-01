export const BANNER_SETTINGS_PATH = "/mlmprofile?mode=settings";

const BANNER_SETTINGS_RETURN_KEY = "bannerSettingsReturn";
const INTERNAL_ORIGIN = "https://mlmlive.local";

export function isBannerSettingsRoute(pathname, search = "") {
  if (pathname !== "/mlmprofile") return false;

  try {
    return new URLSearchParams(search).get("mode") === "settings";
  } catch {
    return false;
  }
}

function normalizeInternalRoute(value) {
  if (typeof value !== "string") return null;

  const route = value.trim();
  if (!route.startsWith("/") || route.startsWith("//")) return null;

  try {
    const parsed = new URL(route, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN) return null;
    if (isBannerSettingsRoute(parsed.pathname, parsed.search)) return null;

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

/**
 * Store the exact in-app route that opened Banner Settings. Keeping the
 * original React Router state is especially important for Editor, whose own
 * back target may be the currently filled form rather than Home.
 */
export function createBannerSettingsNavigationState(location) {
  const returnTo =
    normalizeInternalRoute(
      `${location?.pathname || "/"}${location?.search || ""}${location?.hash || ""}`,
    ) || "/";

  return {
    [BANNER_SETTINGS_RETURN_KEY]: {
      to: returnTo,
      state: location?.state ?? null,
    },
  };
}

/**
 * A missing/invalid origin means Banner Settings was opened directly, so Home
 * remains the safe deterministic fallback.
 */
export function getBannerSettingsReturn(navigationState) {
  const saved = navigationState?.[BANNER_SETTINGS_RETURN_KEY];
  const to = normalizeInternalRoute(saved?.to);

  if (!to) {
    return { to: "/", state: null, hasSavedOrigin: false };
  }

  return {
    to,
    state: saved?.state ?? null,
    hasSavedOrigin: true,
  };
}
