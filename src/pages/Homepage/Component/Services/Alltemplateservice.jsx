import { db } from "@firebase-config";
import { COLLECTIONS } from "../../../../collections";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import {
  getAllGeneralTemplates,
  loadGeneralTemplateIndex,
} from "./generalTemplateIndex";
import {
  fetchGeneralTypeCatalog,
  fetchMlmTypeCatalog,
  getTemplateCatalogVersion,
} from "./templateCdnService";

export const ALL_TEMPLATE_GRAPHICS_CACHE_TTL_MS = 5 * 60 * 1000;

const _graphicsCache = new Map();
const _graphicsRequests = new Map();
let _graphicsCacheGeneration = 0;
const GRAPHICS_SESSION_CACHE_PREFIX = "mlmlive_all_template_graphics_v2:";

async function fetchGeneralTemplatesForType(selectedType) {
  // Every General type is CDN-first. Static bundled JSON is only an emergency
  // fallback for legacy types; Latest Update/Domestic Trip still fall back to
  // Firestore because they were never bundled as authoritative live data.
  const cdnItems = await fetchGeneralTypeCatalog(selectedType);
  if (cdnItems !== null) {
    return cdnItems
      .filter((data) => data?.MainType === "General" && data?.Active === true && data?.Launched === true)
      .map(normalizeRaw)
      .sort((a, b) => Number(a.serial || 0) - Number(b.serial || 0));
  }

  const indexState = await loadGeneralTemplateIndex();
  if (indexState?.source === "cdn") {
    return getAllGeneralTemplates(selectedType);
  }

  // Emergency only when both the per-type CDN object and all-General master
  // are unavailable. Normal runtime performs zero Firestore reads here.
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.MLMTEMPLATE),
      where("SelectType", "==", selectedType),
      where("MainType", "==", "General"),
      where("Active", "==", true),
      where("Launched", "==", true),
    ),
  );
  return snapshot.docs
    .filter((docSnap) => {
      const data = docSnap.data();
      return data?.MainType === "General" && data?.Active === true && data?.Launched === true;
    })
    .map(normalizeDoc)
    .sort((a, b) => Number(a.serial || 0) - Number(b.serial || 0));
}

function getGraphicsCacheKey(selectedType, companyName) {
  return `${String(companyName || "").trim()}::${String(selectedType || "").trim()}`;
}

function readGraphicsSessionCache(cacheKey) {
  try {
    const raw = sessionStorage.getItem(`${GRAPHICS_SESSION_CACHE_PREFIX}${cacheKey}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (
      !entry ||
      !Array.isArray(entry.templates) ||
      Date.now() - Number(entry.timestamp || 0) >= ALL_TEMPLATE_GRAPHICS_CACHE_TTL_MS
    ) {
      sessionStorage.removeItem(`${GRAPHICS_SESSION_CACHE_PREFIX}${cacheKey}`);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeGraphicsSessionCache(cacheKey, entry) {
  try {
    sessionStorage.setItem(
      `${GRAPHICS_SESSION_CACHE_PREFIX}${cacheKey}`,
      JSON.stringify(entry),
    );
  } catch {
    // Large graphics sets can exceed browser storage quota; memory cache remains.
  }
}

function clearGraphicsSessionCache() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(GRAPHICS_SESSION_CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {}
}

export function clearAllTemplateGraphicsCache() {
  _graphicsCacheGeneration += 1;
  _graphicsCache.clear();
  _graphicsRequests.clear();
  clearGraphicsSessionCache();
}

export function primeAllTemplateGraphicsCache(
  selectedType,
  companyName,
  templates,
  catalogVersion = "",
) {
  if (!Array.isArray(templates)) return;

  const cacheKey = getGraphicsCacheKey(selectedType, companyName);
  const entry = { timestamp: Date.now(), templates, catalogVersion };
  _graphicsCache.set(cacheKey, entry);
  writeGraphicsSessionCache(cacheKey, entry);
}

const normalizeRaw = (data) => ({
  id: data?.id || "",
  image: data?.Showcase_url || data?.image || "",
  company: data?.Company || data?.company || "",
  Subtype: data?.Subtype,
  type: data?.SelectType || data?.type,
  ShowCaseForm: data?.ShowCaseForm,
  serial: data?.serial,
  MainType: data?.MainType,
  GraphicsLink: Array.isArray(data?.GraphicsLink) ? data.GraphicsLink : [],
});
const normalizeDoc = (doc) => normalizeRaw({ id: doc.id, ...doc.data() });

export const AllTemplateGraphicsService = async (
  selectedType,
  companyName,
) => {
  const cacheKey = getGraphicsCacheKey(selectedType, companyName);
  const catalogVersion = await getTemplateCatalogVersion();
  const cached = _graphicsCache.get(cacheKey);
  if (
    cached &&
    Date.now() - cached.timestamp < ALL_TEMPLATE_GRAPHICS_CACHE_TTL_MS &&
    String(cached.catalogVersion || "") === String(catalogVersion || "")
  ) {
    return cached.templates;
  }

  const persisted = readGraphicsSessionCache(cacheKey);
  if (
    persisted &&
    String(persisted.catalogVersion || "") === String(catalogVersion || "")
  ) {
    _graphicsCache.set(cacheKey, persisted);
    return persisted.templates;
  }

  const pending = _graphicsRequests.get(cacheKey);
  if (pending) return pending;

  const requestGeneration = _graphicsCacheGeneration;
  const request = (async () => {
    const generalTemplates = await fetchGeneralTemplatesForType(selectedType);
    let mlmTemplates = [];

    if (companyName) {
      const cdnItems = await fetchMlmTypeCatalog(companyName, selectedType);
      if (cdnItems !== null) {
        mlmTemplates = cdnItems.map(normalizeRaw);
      } else {
        const mlmSnapshot = await getDocs(
          query(
            collection(db, COLLECTIONS.MLMTEMPLATE),
            where("SelectType", "==", `${selectedType}`),
            where("MainType", "==", "MLM"),
            where("Company", "==", companyName),
            where("Active", "==", true),
            where("Launched", "==", true),
            orderBy("serial"),
          ),
        );
        mlmTemplates = mlmSnapshot.docs.map(normalizeDoc);
      }
    }

    const templates = [...mlmTemplates, ...generalTemplates];
    if (requestGeneration === _graphicsCacheGeneration) {
      const entry = { timestamp: Date.now(), templates, catalogVersion };
      _graphicsCache.set(cacheKey, entry);
      writeGraphicsSessionCache(cacheKey, entry);
    }
    return templates;
  })();

  _graphicsRequests.set(cacheKey, request);
  try {
    return await request;
  } finally {
    if (_graphicsRequests.get(cacheKey) === request) {
      _graphicsRequests.delete(cacheKey);
    }
  }
};

export const Alltemplateservice = async (
  Selected_type,
  lastDoc = null,
  pageSize = 12,
  companyName,
) => {
  try {
    const allGeneralTemplates = await fetchGeneralTemplatesForType(Selected_type);
    const generalOffset = Number(lastDoc?._generalOffset || 0);
    const generalTemplates = allGeneralTemplates.slice(generalOffset, generalOffset + pageSize);
    const nextGeneralOffset = generalOffset + generalTemplates.length;
    const generalHasMore = nextGeneralOffset < allGeneralTemplates.length;

    let mlmTemplates = [];
    let mlmLastDoc = null;
    let mlmOffset = Number(lastDoc?._mlmOffset || 0);
    let mlmHasMore = false;

    if (companyName) {
      const cdnItems = await fetchMlmTypeCatalog(companyName, Selected_type);
      if (cdnItems !== null) {
        const normalized = cdnItems.map(normalizeRaw);
        mlmTemplates = normalized.slice(mlmOffset, mlmOffset + pageSize);
        mlmOffset += mlmTemplates.length;
        mlmHasMore = mlmOffset < normalized.length;
      } else {
        const mlmConstraints = [
          where("SelectType", "==", `${Selected_type}`),
          where("MainType", "==", "MLM"),
          where("Company", "==", companyName),
          where("Active", "==", true),
          where("Launched", "==", true),
          orderBy("serial"),
          limit(pageSize),
        ];

        if (lastDoc?._mlmLastDoc) {
          mlmConstraints.splice(-1, 0, startAfter(lastDoc._mlmLastDoc));
        }

        const mlmSnapshot = await getDocs(
          query(collection(db, COLLECTIONS.MLMTEMPLATE), ...mlmConstraints)
        );
        mlmTemplates = mlmSnapshot.docs.map(normalizeDoc);
        mlmLastDoc = mlmSnapshot.docs[mlmSnapshot.docs.length - 1] || null;
        mlmHasMore = mlmTemplates.length === pageSize;
      }
    }

    const templates = [...mlmTemplates, ...generalTemplates];

    const newLastDoc = {
      _generalOffset: nextGeneralOffset,
      _mlmLastDoc: mlmLastDoc,
      _mlmOffset: mlmOffset,
    };

    const hasMore = generalHasMore || mlmHasMore;

    return { templates, lastDoc: newLastDoc, hasMore };
  } catch (error) {
    
    return { templates: [], lastDoc: null, hasMore: false };
  }
};
