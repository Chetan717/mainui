const RAW_BASE = String(import.meta.env.VITE_TEMPLATE_CDN_BASE_URL || "").trim();
export const TEMPLATE_CDN_BASE_URL = RAW_BASE.replace(/\/+$/, "");
export const TEMPLATE_CDN_ENABLED = /^https?:\/\//i.test(TEMPLATE_CDN_BASE_URL);

const CACHE_NAME = "mlmlive-template-catalog-v1";
const VERSION_STORAGE_KEY = "mlmlive.template-cdn.version.v1";
const LAST_URL_PREFIX = "mlmlive.template-cdn.last-url.v1:";
const VERSION_TTL_MS = 20 * 1000;
const memory = new Map();
const pending = new Map();
let versionState = { value: "", ts: 0 };

function catalogSegment(value) {
  const clean = String(value || "").trim().replace(/[^A-Za-z0-9._-]+/g, "_");
  return (clean || "_").slice(0, 140);
}
function withTimeout(ms = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}
async function openCatalogCache() {
  if (typeof caches === "undefined") return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}
function readStoredVersion() {
  try {
    return localStorage.getItem(VERSION_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}
function writeStoredVersion(value) {
  try {
    if (value) localStorage.setItem(VERSION_STORAGE_KEY, value);
  } catch {}
}
function rememberLastUrl(path, url) {
  try {
    localStorage.setItem(`${LAST_URL_PREFIX}${path}`, url);
  } catch {}
}
function readLastUrl(path) {
  try {
    return localStorage.getItem(`${LAST_URL_PREFIX}${path}`) || "";
  } catch {
    return "";
  }
}

export async function getTemplateCatalogVersion({ force = false } = {}) {
  if (!TEMPLATE_CDN_ENABLED) return "";
  const now = Date.now();
  if (!force && versionState.value && now - versionState.ts < VERSION_TTL_MS) {
    return versionState.value;
  }

  const timeout = withTimeout(3500);
  try {
    const response = await fetch(`${TEMPLATE_CDN_BASE_URL}/catalog/v1/version.json`, {
      cache: "no-store",
      signal: timeout.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error(`catalog version ${response.status}`);
    const payload = await response.json();
    const value = String(payload?.version || "").trim();
    if (!value) throw new Error("catalog version missing");
    versionState = { value, ts: now };
    writeStoredVersion(value);
    return value;
  } catch {
    const stored = readStoredVersion();
    if (stored) versionState = { value: stored, ts: now };
    return stored;
  } finally {
    timeout.done();
  }
}

async function fetchCatalogPayload(path) {
  if (!TEMPLATE_CDN_ENABLED) return null;
  const version = await getTemplateCatalogVersion();
  if (!version) return null;

  const url = `${TEMPLATE_CDN_BASE_URL}/catalog/v1/${path}?v=${encodeURIComponent(version)}`;
  if (memory.has(url)) return memory.get(url);
  if (pending.has(url)) return pending.get(url);

  const request = (async () => {
    const cache = await openCatalogCache();
    if (cache) {
      const hit = await cache.match(url);
      if (hit) {
        try {
          const payload = await hit.json();
          memory.set(url, payload);
          return payload;
        } catch {}
      }
    }

    const timeout = withTimeout(6500);
    try {
      const response = await fetch(url, {
        cache: "default",
        signal: timeout.signal,
        headers: { accept: "application/json" },
      });
      if (response.status === 404) {
        const payload = { __mlmCdnMissing: true };
        memory.set(url, payload);
        rememberLastUrl(path, url);
        return payload;
      }
      if (!response.ok) throw new Error(`catalog ${response.status}`);
      const payload = await response.clone().json();
      memory.set(url, payload);
      rememberLastUrl(path, url);
      if (cache) await cache.put(url, response).catch(() => null);
      return payload;
    } catch {
      // Offline/transient CDN issue: use the last successfully cached version
      // before falling back to Firestore in the calling service.
      const lastUrl = readLastUrl(path);
      if (cache && lastUrl) {
        const stale = await cache.match(lastUrl);
        if (stale) {
          try {
            const payload = await stale.json();
            memory.set(lastUrl, payload);
            return payload;
          } catch {}
        }
      }
      return null;
    } finally {
      timeout.done();
    }
  })();

  pending.set(url, request);
  try {
    return await request;
  } finally {
    if (pending.get(url) === request) pending.delete(url);
  }
}

function itemsOf(payload) {
  // A missing catalog object means bootstrap/publish is incomplete, not that
  // the category is empty. Return null so callers use their Firestore/bundled
  // emergency fallback. A real empty category is published as { items: [] }.
  if (payload?.__mlmCdnMissing) return null;
  return payload && Array.isArray(payload.items) ? payload.items : null;
}
function homePayloadOf(payload) {
  if (payload?.__mlmCdnMissing) return null;
  return payload;
}

export async function fetchGeneralMasterCatalog() {
  const payload = await fetchCatalogPayload("genaral_template_firestore_data.json");
  if (payload?.__mlmCdnMissing) return null;
  return payload && payload.data && typeof payload.data === "object" ? payload : null;
}

export async function fetchHomeGeneralCatalog() {
  return homePayloadOf(await fetchCatalogPayload("home/general.json"));
}
export async function fetchHomeCompanyCatalog(company) {
  if (!company) return null;
  return homePayloadOf(await fetchCatalogPayload(`home/company/${catalogSegment(company)}.json`));
}
export async function fetchGeneralTypeCatalog(type) {
  return itemsOf(await fetchCatalogPayload(`general/${catalogSegment(type)}.json`));
}
export async function fetchMlmTypeCatalog(company, type) {
  if (!company || !type) return null;
  return itemsOf(
    await fetchCatalogPayload(`mlm/${catalogSegment(company)}/${catalogSegment(type)}.json`),
  );
}
export async function fetchFestivalCatalog(date) {
  if (!date) return null;
  return itemsOf(await fetchCatalogPayload(`festival/${catalogSegment(date)}.json`));
}
export async function fetchTrendingGeneralCatalog(date) {
  if (!date) return null;
  return itemsOf(await fetchCatalogPayload(`trending/general/${catalogSegment(date)}.json`));
}
export async function fetchTemplateCatalogById(id) {
  if (!id) return null;
  const payload = await fetchCatalogPayload(`template/${catalogSegment(id)}.json`);
  return payload?.template || null;
}

export function clearTemplateCdnRuntimeCache() {
  memory.clear();
  pending.clear();
  versionState = { value: "", ts: 0 };
}
