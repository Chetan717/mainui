const VITE_ENV = import.meta.env || {};

export const R2_PROFILE_BASE_URL = String(
  VITE_ENV.VITE_R2_PROFILE_BASE_URL ||
    "https://pub-a9fc3713abb3442ba09ff324db4e136f.r2.dev",
).replace(/\/+$/, "");

const decodePath = (value) => {
  try {
    return String(value || "")
      .split("/")
      .filter(Boolean)
      .map((part) => decodeURIComponent(part))
      .join("/");
  } catch {
    return "";
  }
};

export function getFirebaseStorageObjectPath(url) {
  try {
    const parsed = new URL(String(url || ""));
    const marker = "/o/";
    const index = parsed.pathname.indexOf(marker);
    if (index >= 0) {
      return decodeURIComponent(parsed.pathname.slice(index + marker.length));
    }
    if (parsed.hostname === "storage.googleapis.com") {
      const parts = parsed.pathname.replace(/^\/+/, "").split("/");
      if (parts.length >= 2) return decodePath(parts.slice(1).join("/"));
    }
  } catch {}
  return "";
}

export function getR2ProfileObjectPath(url) {
  try {
    const base = new URL(`${R2_PROFILE_BASE_URL}/`);
    const parsed = new URL(String(url || ""));
    if (parsed.origin !== base.origin) return "";
    const basePath = base.pathname.replace(/\/+$/, "");
    if (basePath && !parsed.pathname.startsWith(`${basePath}/`)) return "";
    const relative = parsed.pathname.slice(basePath.length).replace(/^\/+/, "");
    return decodePath(relative);
  } catch {
    return "";
  }
}

export function getProfileObjectPath(url) {
  const r2Path = getR2ProfileObjectPath(url);
  if (r2Path?.startsWith("mlmprofiles/")) return r2Path;
  const firebasePath = getFirebaseStorageObjectPath(url);
  return firebasePath?.startsWith("mlmprofiles/") ? firebasePath : "";
}

export function isR2ProfileUrl(url) {
  return !!getR2ProfileObjectPath(url)?.startsWith("mlmprofiles/");
}

export function isProfileAssetUrl(url) {
  return !!getProfileObjectPath(url);
}

export function toR2ProfileUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (isR2ProfileUrl(url)) return url;
  const objectPath = getFirebaseStorageObjectPath(url);
  if (!objectPath?.startsWith("mlmprofiles/")) return url;
  const encoded = objectPath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${R2_PROFILE_BASE_URL}/${encoded}`;
}

// During the dual-storage rollout we must preserve legacy Firebase download
// URLs exactly as Firestore stored them. Converting them to R2 eagerly can
// break editor/canvas rendering when a recently-created Firebase object has
// not been resynced to R2 yet. New uploads already store R2 URLs, and after
// the final Firestore cutover the same read path will naturally receive R2.
const normalizeProfileReadUrl = (value) =>
  typeof value === "string" ? value.trim() : value;

export const normalizeProfileUrlArray = (values = []) =>
  Array.isArray(values)
    ? values.map((value) => normalizeProfileReadUrl(value)).filter(Boolean)
    : [];

export function normalizeMlmProfileAssetUrls(profile) {
  if (!profile || typeof profile !== "object") return profile;
  return {
    ...profile,
    ...(Array.isArray(profile.profileImageURLs)
      ? { profileImageURLs: normalizeProfileUrlArray(profile.profileImageURLs) }
      : {}),
    ...(Array.isArray(profile.topuplineURLs)
      ? { topuplineURLs: normalizeProfileUrlArray(profile.topuplineURLs) }
      : {}),
    ...(profile.profileImageURL
      ? { profileImageURL: normalizeProfileReadUrl(profile.profileImageURL) }
      : {}),
  };
}

function normalizeStoredFormAssets(form) {
  if (!form || typeof form !== "object") return form;
  return {
    ...form,
    ...(Array.isArray(form.selectedLinks)
      ? { selectedLinks: normalizeProfileUrlArray(form.selectedLinks) }
      : {}),
    ...(Array.isArray(form.topuplineURLs)
      ? { topuplineURLs: normalizeProfileUrlArray(form.topuplineURLs) }
      : {}),
  };
}

// Kept for backwards compatibility with the existing startup call. During
// dual-storage mode this only sanitizes stored arrays; it intentionally does
// NOT rewrite Firebase mlmprofiles URLs to R2. That guarantees old Firebase
// profile photos keep working in canvas until the Firestore URL migration is
// actually completed.
export function migrateStoredProfileAssetsToR2() {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem("mlmProfile");
    if (raw) {
      const parsed = JSON.parse(raw);
      sessionStorage.setItem(
        "mlmProfile",
        JSON.stringify(normalizeMlmProfileAssetUrls(parsed)),
      );
    }
  } catch {}
  try {
    const raw = localStorage.getItem("mlmform");
    if (raw) {
      const parsed = JSON.parse(raw);
      localStorage.setItem(
        "mlmform",
        JSON.stringify(normalizeStoredFormAssets(parsed)),
      );
    }
  } catch {}
}
