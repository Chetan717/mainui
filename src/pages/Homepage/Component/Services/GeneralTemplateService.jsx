import { db } from "@firebase-config";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from "firebase/firestore";
import { COLLECTIONS } from "../../../../collections";
import {
  getAllGeneralTemplates,
  getGeneralTemplatesForHome,
  loadGeneralTemplateIndex,
} from "./generalTemplateIndex";
import { primeAllTemplateGraphicsCache } from "./Alltemplateservice";
import { RANK_PROMOTION_TYPES } from "../../../../utils/templateTypeConfig";
import {
  fetchHomeCompanyCatalog,
  fetchHomeGeneralCatalog,
  getTemplateCatalogVersion,
  clearTemplateCdnRuntimeCache,
} from "./templateCdnService";

const TYPE_GROUPS = [
  [
    "Today_Trending",
    "Latest_update",
    "Product",
    "Motivational",
    ...RANK_PROMOTION_TYPES,
    "Bonanza",
    "Domestic_Trip",
    "Welcome_Closing",
    "Training",
    "Meeting",
    // "General_Meeting",
  ],
  [
    "Achievements",
    "Income",
    "Anniversary_Birthday",
    "ThankYou_Banner_B",
    "ThankYou_Birthday_Anniversary",
    "Capping",
  ],
  [
    "Good_Morning",
    "Sport",
    "Daily_Life",
    "Greeting_Wishes",
    "Health_Tips",
    "Devotional_Spiritual",
    "Leader_Quotes",
  ],
];
export const TEMPLATE_GROUP_COUNT = TYPE_GROUPS.length;


// 5-minute memory + same-tab session cache to avoid duplicate Firestore reads.
// Explicit refresh/company invalidation still clears the cache immediately.
const _cache = new Map();
let _cacheGeneration = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_CACHE_PREFIX = "mlmlive_home_templates_v2:";

function readSessionCache(cacheKey) {
  try {
    const raw = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${cacheKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.data) || Date.now() - Number(parsed.ts || 0) >= CACHE_TTL_MS) {
      sessionStorage.removeItem(`${SESSION_CACHE_PREFIX}${cacheKey}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionCache(cacheKey, entry) {
  try {
    sessionStorage.setItem(
      `${SESSION_CACHE_PREFIX}${cacheKey}`,
      JSON.stringify(entry),
    );
  } catch {
    // Storage quota/privacy mode: in-memory cache still works.
  }
}

function clearSessionCache() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(SESSION_CACHE_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {}
}

export function getTemplateCache() {
  return _cache;
}

export function clearTemplateCache() {
  _cacheGeneration += 1;
  clearTemplateCdnRuntimeCache();
  _cache.clear();
  clearSessionCache();
}

const normalizeTemplate = (data, id = data?.id) => ({
  id: id || data?.id || "",
  MainType: data?.MainType,
  image: data?.Showcase_url || data?.image || "",
  GraphicsLink: Array.isArray(data?.GraphicsLink) ? data.GraphicsLink : [],
  type: data?.SelectType || data?.type,
  Subtype: data?.Subtype,
  ShowCaseForm: data?.ShowCaseForm,
  serial: data?.serial,
});
const normalizeDoc = (doc) => normalizeTemplate(doc.data(), doc.id);

// Max templates to fetch per type on the home page
const HOME_LIMIT = 30;
// Legacy cache completeness rule remains conceptually identical:
// mlmTemplates.length < HOME_LIMIT means the Home slice is complete.

export const fetchGeneralTemplates = async (groupIndex, company) => {
  const cacheKey = `${groupIndex}__${company || ""}`;
  const requestGeneration = _cacheGeneration;

  // A browser refresh must see a freshly-published Admin edit immediately.
  // Cache entries are therefore tied to the tiny R2 version.json manifest.
  // A new catalog version invalidates both memory and session caches without
  // causing Firestore reads.
  const catalogVersion = await getTemplateCatalogVersion();

  if (_cache.has(cacheKey)) {
    const entry = _cache.get(cacheKey);
    if (
      Date.now() - Number(entry?.ts || 0) < CACHE_TTL_MS &&
      String(entry?.catalogVersion || "") === String(catalogVersion || "")
    ) {
      return entry.data;
    }
    _cache.delete(cacheKey);
  }

  const persisted = readSessionCache(cacheKey);
  if (
    persisted &&
    String(persisted?.catalogVersion || "") === String(catalogVersion || "")
  ) {
    _cache.set(cacheKey, persisted);
    return persisted.data;
  }

  // Fetch fresh from Firestore
  try {
    const selectedTypes = TYPE_GROUPS[groupIndex];
    if (!selectedTypes) return [];

    // Refresh the legacy all-General index from R2. Home still prefers the
    // smaller home/general.json slice, while this live master powers deep
    // search and emergency fallback without a bundled stale export.
    const generalIndexState = await loadGeneralTemplateIndex();

    // CDN-first: Home needs only two small catalog files regardless of how
    // many template types are shown. Firestore remains an emergency fallback.
    const [homeGeneralCatalog, homeCompanyCatalog] = await Promise.all([
      fetchHomeGeneralCatalog(),
      company ? fetchHomeCompanyCatalog(company) : Promise.resolve(null),
    ]);

    const results = await Promise.all(
      selectedTypes.map(async (type) => {
        const bundledGeneralTemplates = getGeneralTemplatesForHome(type, HOME_LIMIT);

        const hasGeneralCdn = homeGeneralCatalog !== null;
        const hasCompanyCdn = company ? homeCompanyCatalog !== null : true;

        // ALL General types are R2/CDN-first. Previously only Latest Update and
        // Domestic Trip used the live catalog, so Admin edits to Product,
        // Motivational, Income, etc. kept showing the old bundled JSON.
        let generalTemplates = bundledGeneralTemplates;
        let generalCount = bundledGeneralTemplates.length;
        let completeGeneralTemplates = getAllGeneralTemplates(type);

        if (hasGeneralCdn) {
          const raw = Array.isArray(homeGeneralCatalog?.types?.[type])
            ? homeGeneralCatalog.types[type]
            : [];
          generalTemplates = raw.map((item) => normalizeTemplate(item)).slice(0, HOME_LIMIT);
          generalCount = Number(homeGeneralCatalog?.counts?.[type] ?? raw.length);
          completeGeneralTemplates = generalCount < HOME_LIMIT ? generalTemplates : null;
        } else if (generalIndexState?.source !== "cdn") {
          // Emergency only: if both R2 home catalog and all-General master are
          // unavailable, query Firestore so the app does not go blank.
          const liveGeneralSnapshot = await getDocs(
            query(
              collection(db, COLLECTIONS.MLMTEMPLATE),
              where("SelectType", "==", type),
              where("MainType", "==", "General"),
              where("Active", "==", true),
              where("Launched", "==", true),
              limit(HOME_LIMIT),
            ),
          );
          generalTemplates = liveGeneralSnapshot.docs
            .filter((docSnap) => {
              const data = docSnap.data();
              return data?.MainType === "General" && data?.Active === true && data?.Launched === true;
            })
            .map(normalizeDoc)
            .sort((a, b) => Number(a.serial || 0) - Number(b.serial || 0))
            .slice(0, HOME_LIMIT);
          generalCount = generalTemplates.length;
          completeGeneralTemplates = generalCount < HOME_LIMIT ? generalTemplates : null;
        }

        let mlmTemplates = [];
        let mlmCount = 0;
        if (company && hasCompanyCdn) {
          const raw = Array.isArray(homeCompanyCatalog?.types?.[type])
            ? homeCompanyCatalog.types[type]
            : [];
          mlmTemplates = raw.map((item) => normalizeTemplate(item)).slice(0, HOME_LIMIT);
          mlmCount = Number(homeCompanyCatalog?.counts?.[type] ?? raw.length);
        } else if (company) {
          const mlmSnapshot = await getDocs(
            query(
              collection(db, COLLECTIONS.MLMTEMPLATE),
              where("MainType", "==", "MLM"),
              where("Company", "==", company),
              where("SelectType", "==", type),
              where("Active", "==", true),
              where("Launched", "==", true),
              orderBy("serial"),
              limit(HOME_LIMIT),
            ),
          );
          mlmTemplates = mlmSnapshot.docs.map(normalizeDoc);
          mlmCount = mlmTemplates.length;
        }

        const completeMlm = !company || mlmCount < HOME_LIMIT;
        return {
          type,
          templates: [...mlmTemplates, ...generalTemplates],
          completeTemplates:
            completeMlm && Array.isArray(completeGeneralTemplates)
              ? [...mlmTemplates, ...completeGeneralTemplates]
              : null,
        };
      }),
    );

    const data = results.map(({ type, templates }) => ({ type, templates }));

    // A company switch may have cleared the cache while Firestore was still
    // responding. Never let that obsolete request repopulate the cache.
    if (requestGeneration === _cacheGeneration) {
      for (const result of results) {
        if (result.completeTemplates) {
          primeAllTemplateGraphicsCache(
            result.type,
            company,
            result.completeTemplates,
            catalogVersion,
          );
        }
      }
      const entry = { ts: Date.now(), data, catalogVersion };
      _cache.set(cacheKey, entry);
      writeSessionCache(cacheKey, entry);
    }
    return data;
  } catch (error) {
    
    return [];
  }
};
