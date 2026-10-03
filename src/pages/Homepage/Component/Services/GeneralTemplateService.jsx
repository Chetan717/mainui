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
} from "./generalTemplateIndex";
import { primeAllTemplateGraphicsCache } from "./Alltemplateservice";
import { RANK_PROMOTION_TYPES } from "../../../../utils/templateTypeConfig";

const TYPE_GROUPS = [
  [
    "Today_Trending",
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
  _cache.clear();
  clearSessionCache();
}

const normalizeDoc = (doc) => ({
  id: doc.id,
  MainType: doc.data().MainType,
  image: doc.data().Showcase_url,
  GraphicsLink: doc.data().GraphicsLink || [],
  type: doc.data().SelectType,
  Subtype: doc.data().Subtype,
  ShowCaseForm: doc.data().ShowCaseForm,
  serial: doc.data().serial,
});

// Max templates to fetch per type on the home page
const HOME_LIMIT = 30;

export const fetchGeneralTemplates = async (groupIndex, company) => {
  const cacheKey = `${groupIndex}__${company || ""}`;
  const requestGeneration = _cacheGeneration;

  // In-memory cache hit (with TTL check)
  if (_cache.has(cacheKey)) {
    const { ts, data } = _cache.get(cacheKey);
    if (Date.now() - ts < CACHE_TTL_MS) {
      return data;
    }
    // Expired — remove and re-fetch
    _cache.delete(cacheKey);
  }

  // Preserve the same 5-minute freshness window across a hard page refresh.
  // Pull-to-refresh/company changes call clearTemplateCache(), so explicit
  // refresh behaviour remains fresh.
  const persisted = readSessionCache(cacheKey);
  if (persisted) {
    _cache.set(cacheKey, persisted);
    return persisted.data;
  }

  // Fetch fresh from Firestore
  try {
    const selectedTypes = TYPE_GROUPS[groupIndex];
    if (!selectedTypes) return [];

    const results = await Promise.all(
      selectedTypes.map(async (type) => {
        const bundledGeneralTemplates = getGeneralTemplatesForHome(type, HOME_LIMIT);
        const isLiveGeneralType = type === "Domestic_Trip";

        const [liveGeneralSnapshot, mlmSnapshot] = await Promise.all([
          isLiveGeneralType
            ? getDocs(
                query(
                  collection(db, COLLECTIONS.MLMTEMPLATE),
                  where("SelectType", "==", type),
                  where("MainType", "==", "General"),
                  where("Active", "==", true),
                  where("Launched", "==", true),
                  limit(HOME_LIMIT),
                ),
              )
            : Promise.resolve({ docs: [] }),
          company
            ? getDocs(
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
              )
            : Promise.resolve({ docs: [] }),
        ]);

        const liveGeneralTemplates = liveGeneralSnapshot.docs
          .filter((docSnap) => {
            const data = docSnap.data();
            return (
              data?.MainType === "General" &&
              data?.Active === true &&
              data?.Launched === true
            );
          })
          .map(normalizeDoc)
          .sort((a, b) => Number(a.serial || 0) - Number(b.serial || 0))
          .slice(0, HOME_LIMIT);

        const generalTemplates = isLiveGeneralType
          ? liveGeneralTemplates
          : bundledGeneralTemplates;
        const mlmTemplates = mlmSnapshot.docs.map(normalizeDoc);

        return {
          type,
          templates: [...mlmTemplates, ...generalTemplates],
          // A short Firestore result proves that Home already received every
          // matching company template. Reuse it with the complete local JSON
          // set on View All. Exactly HOME_LIMIT remains intentionally
          // unprimed because more remote documents may exist.
          completeTemplates:
            !isLiveGeneralType && mlmTemplates.length < HOME_LIMIT
              ? [...mlmTemplates, ...getAllGeneralTemplates(type)]
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
          );
        }
      }
      const entry = { ts: Date.now(), data };
      _cache.set(cacheKey, entry);
      writeSessionCache(cacheKey, entry);
    }
    return data;
  } catch (error) {
    
    return [];
  }
};
