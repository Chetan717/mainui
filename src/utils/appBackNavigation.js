import {
  getEditorBackTarget,
  getTemplateFlowReturnTarget,
} from "./editorNavigation.js";
import { runProfileNavigationGuard } from "./profileNavigation.js";
import {
  getBannerSettingsReturn,
  isBannerSettingsRoute,
} from "./bannerSettingsNavigation.js";
import { getAllTemplatesBackTarget } from "./allTemplatesNavigation.js";

const HOME_BACK_ROUTES = new Set([
  "/alltemp",
  "/mlmform",
  "/mlmprofile",
  "/subscription",
  "/profile",
  "/reporting",
  "/ask-ai",
]);

const ROOT_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
  "/forgetpin",
  "/selectcomp",
  "/logout",
]);

/**
 * A string is a deterministic replacement target, undefined means browser
 * history is safe as a fallback, and null means there is no in-app back route.
 */
export function getAppBackTarget(
  pathname,
  selectedType,
  navigationState,
  search = "",
) {
  if (pathname === "/editor") {
    return getEditorBackTarget(selectedType, navigationState);
  }
  if (isBannerSettingsRoute(pathname, search)) {
    return getBannerSettingsReturn(navigationState).to;
  }
  if (pathname === "/alltemp") {
    return getAllTemplatesBackTarget(search);
  }
  if (pathname === "/mlmform") {
    return getTemplateFlowReturnTarget({
      selectedType,
      navigationState,
      fallback: "/",
    });
  }
  if (HOME_BACK_ROUTES.has(pathname)) return "/";
  if (ROOT_ROUTES.has(pathname)) return null;
  return undefined;
}

/**
 * Run exactly one app-level back action. Known routes never depend on stale
 * browser/WebView history, so Editor cannot reopen an old template page and
 * sub-pages cannot bounce through Login or another previous session.
 */
export function runAppBackNavigation({
  pathname,
  navigationState,
  navigate,
  selectedType,
  search,
}) {
  const bannerSettingsReturn = isBannerSettingsRoute(pathname, search)
    ? getBannerSettingsReturn(navigationState)
    : null;
  const target = getAppBackTarget(
    pathname,
    selectedType,
    navigationState,
    search,
  );
  if (target === null) return false;

  const proceed = () => {
    if (target === undefined) {
      navigate(-1);
      return;
    }
    navigate(target, {
      replace: true,
      ...(bannerSettingsReturn
        ? { state: bannerSettingsReturn.state }
        : {}),
    });
  };

  // The profile page may block the action while unsaved changes are handled.
  // The back press is still consumed so a native WebView cannot perform a
  // second history step underneath that confirmation.
  runProfileNavigationGuard(pathname, proceed);
  return true;
}
